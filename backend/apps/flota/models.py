from django.conf import settings
from django.db import models
from django.utils import timezone


class Vehiculo(models.Model):
    """Vehículo de la flota — el checklist aplica igual para todos los tipos."""

    class Tipo(models.TextChoices):
        CAMIONETA = 'camioneta', 'Camioneta'
        CAMION = 'camion', 'Camión'
        MOTO = 'moto', 'Moto'
        CUATRIMOTO = 'cuatrimoto', 'Cuatrimoto'
        UTV = 'utv', 'UTV'
        POLARIS = 'polaris', 'Polaris'
        CAN_AM = 'can_am', 'CAN AM'
        REMOLQUE = 'remolque', 'Remolque'
        TRAILA = 'traila', 'Traila'
        MAQUINARIA = 'maquinaria', 'Maquinaria'
        PLATAFORMA = 'plataforma', 'Plataforma'
        VAN = 'van', 'Van'
        OTRO = 'otro', 'Otro'

    class Estado(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        EN_TALLER = 'en_taller', 'En taller'
        DE_BAJA = 'de_baja', 'De baja'

    equipo = models.CharField(max_length=150, blank=True)
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField(null=True, blank=True)
    color = models.CharField(max_length=50)
    placas = models.CharField(max_length=20, blank=True)
    numero_serie = models.CharField(max_length=50, blank=True)
    kilometraje_actual = models.DecimalField(max_digits=10, decimal_places=2)
    uso_asignacion = models.CharField(max_length=200, blank=True)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.ACTIVO)
    fecha_vencimiento_tenencia = models.DateField(null=True, blank=True)
    fecha_vencimiento_placas = models.DateField(null=True, blank=True)
    foto = models.ImageField(upload_to='flota/vehiculos/', null=True, blank=True)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Vehículo'
        verbose_name_plural = 'Vehículos'

    def __str__(self):
        return f'{self.nombre} — {self.marca} {self.modelo} ({self.anio})'


class ChecklistVehiculo(models.Model):
    """Checklist de salida o llegada — el responsable es quien usó el vehículo.

    Cada ítem aplicable requiere una foto de evidencia (FotoChecklist.item) — el ítem
    solo cuenta como verificado si tiene su foto adjunta.
    """

    class TipoReporte(models.TextChoices):
        SALIDA = 'salida', 'Salida'
        LLEGADA = 'llegada', 'Llegada'

    class PresionLlantas(models.TextChoices):
        BIEN = 'bien', 'Presión correcta'
        DELANTERO_IZQUIERDO = 'delantero_izquierdo', 'Delantera izquierda baja/ponchada'
        DELANTERO_DERECHO = 'delantero_derecho', 'Delantera derecha baja/ponchada'
        TRASERO_IZQUIERDO = 'trasero_izquierdo', 'Trasera izquierda baja/ponchada'
        TRASERO_DERECHO = 'trasero_derecho', 'Trasera derecha baja/ponchada'

    # CAN-AM, Polaris y cuatrimotos: se registran en horas (horómetro) en vez de km,
    # llevan traila al campo y no reportan aceite de transmisión.
    TIPOS_OFF_ROAD = (Vehiculo.Tipo.CAN_AM, Vehiculo.Tipo.POLARIS, Vehiculo.Tipo.CUATRIMOTO)

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name='checklists')
    tipo_reporte = models.CharField(max_length=10, choices=TipoReporte.choices)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='checklists_flota'
    )
    fecha_hora = models.DateTimeField(default=timezone.now)
    km_reporte = models.DecimalField(max_digits=10, decimal_places=2)  # km u horas, según tipo de vehículo
    nivel_combustible = models.IntegerField()  # mínimo 50% para poder salir a campo

    # Ítems del checklist — cada uno requiere foto de evidencia (ver FotoChecklist.item)
    estado_fisico = models.BooleanField(default=False)  # salida y llegada — 4 costados + interior opcional
    lavado = models.BooleanField(default=False)  # solo llegada
    soplado_filtro_aire = models.BooleanField(default=False)  # solo salida, vehículos off-road
    presion_llantas = models.CharField(
        max_length=25, choices=PresionLlantas.choices, blank=True
    )  # solo salida — vacío = sin revisar
    llanta_cambiada = models.BooleanField(default=False)  # se reemplazó la llanta completa (no solo presión)
    anticongelante = models.BooleanField(default=False)  # solo salida
    nivel_aceite_motor = models.BooleanField(default=False)  # solo salida
    nivel_aceite_transmision = models.BooleanField(default=False)  # solo salida, vehículos no off-road
    carga_traila = models.BooleanField(default=False)  # salida y llegada, solo vehículos off-road
    traila = models.ForeignKey(
        Vehiculo,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='checklists_traila',
        limit_choices_to={'tipo': Vehiculo.Tipo.TRAILA},
    )  # solo trailas 4x5 — motos/CAN-AM/Polaris no pueden jalar otro tamaño

    # Checklist de la traila misma (cuando la traila es el vehículo del checklist) —
    # no tiene motor, combustible ni odómetro, así que solo aplican estos 3 + presión de llantas.
    limpieza = models.BooleanField(default=False)
    sin_herramientas = models.BooleanField(default=False)
    sin_carga = models.BooleanField(default=False)

    observaciones = models.TextField(blank=True)
    validado = models.BooleanField(default=False)
    validado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='checklists_validados',
    )
    validado_en = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = 'Checklist de vehículo'
        verbose_name_plural = 'Checklists de vehículos'

    def __str__(self):
        nombre = self.responsable.get_full_name() or self.responsable.username
        return f'{self.vehiculo.nombre} — {self.get_tipo_reporte_display()} ({nombre}, {self.fecha_hora:%Y-%m-%d})'

    def _es_off_road(self):
        return bool(self.vehiculo_id and self.vehiculo.tipo in self.TIPOS_OFF_ROAD)

    def _es_traila(self):
        return bool(self.vehiculo_id and self.vehiculo.tipo == Vehiculo.Tipo.TRAILA)

    # Las "motos" reales de la reserva están dadas de alta como tipo cuatrimoto
    # (ej. "Moto roja", "Moto azul") — ninguna de las dos registra kilometraje ni horómetro.
    TIPOS_SIN_KILOMETRAJE = (Vehiculo.Tipo.MOTO, Vehiculo.Tipo.CUATRIMOTO)

    def _sin_kilometraje(self):
        return bool(self.vehiculo_id and self.vehiculo.tipo in self.TIPOS_SIN_KILOMETRAJE)

    def items_aplicables(self):
        if self._es_traila():
            return ['presion_llantas', 'limpieza', 'sin_herramientas', 'sin_carga']

        off_road = self._es_off_road()
        sin_kilometraje = self._sin_kilometraje()

        if self.tipo_reporte == self.TipoReporte.LLEGADA:
            items = ['estado_fisico', 'lavado']
            if not sin_kilometraje:
                items.append('kilometraje')
            if off_road:
                items.append('carga_traila')
            return items

        items = ['estado_fisico', 'nivel_aceite_motor', 'anticongelante', 'presion_llantas']
        if not sin_kilometraje:
            items.append('kilometraje')
        if off_road:
            items += ['soplado_filtro_aire', 'carga_traila']
        else:
            items.append('nivel_aceite_transmision')
        return items

    def items_verificados(self):
        verificados = 0
        for campo in self.items_aplicables():
            if campo == 'presion_llantas':
                verificados += 1 if self.presion_llantas else 0
            elif campo == 'kilometraje':
                verificados += 1 if self.pk and self.fotos.filter(item='kilometraje').exists() else 0
            else:
                verificados += 1 if getattr(self, campo) else 0
        return verificados

    def total_items(self):
        return len(self.items_aplicables())


class AdvertenciaChecklist(models.Model):
    """Advertencia que administrador/superadmin deja al responsable sobre un checklist.

    El checklist siempre se valida — la advertencia es independiente y no bloquea nada,
    solo queda registrada para dar seguimiento al conductor.
    """

    checklist = models.ForeignKey(ChecklistVehiculo, on_delete=models.CASCADE, related_name='advertencias')
    motivo = models.TextField()
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='advertencias_creadas'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Advertencia de checklist'
        verbose_name_plural = 'Advertencias de checklist'

    def __str__(self):
        return f'Advertencia — {self.checklist} ({self.creada_por})'


class FotoChecklist(models.Model):
    class Item(models.TextChoices):
        KILOMETRAJE = 'kilometraje', 'Kilometraje / horómetro'
        ESTADO_FISICO_DERECHO = 'estado_fisico_derecho', 'Estado físico — costado derecho'
        ESTADO_FISICO_IZQUIERDO = 'estado_fisico_izquierdo', 'Estado físico — costado izquierdo'
        ESTADO_FISICO_FRENTE = 'estado_fisico_frente', 'Estado físico — frente'
        ESTADO_FISICO_TRASERO = 'estado_fisico_trasero', 'Estado físico — trasero'
        ESTADO_FISICO_INTERIOR = 'estado_fisico_interior', 'Estado físico — interior'
        LAVADO = 'lavado', 'Lavado'
        SOPLADO_FILTRO_AIRE = 'soplado_filtro_aire', 'Sopleteo de filtro de aire'
        PRESION_LLANTAS = 'presion_llantas', 'Presión de llantas'
        ANTICONGELANTE = 'anticongelante', 'Anticongelante'
        NIVEL_ACEITE_MOTOR = 'nivel_aceite_motor', 'Nivel de aceite motor'
        NIVEL_ACEITE_TRANSMISION = 'nivel_aceite_transmision', 'Nivel de aceite transmisión'
        CARGA_TRAILA = 'carga_traila', 'Carga de la traila'
        LIMPIEZA = 'limpieza', 'Limpieza'
        SIN_HERRAMIENTAS = 'sin_herramientas', 'Sin herramientas'
        SIN_CARGA = 'sin_carga', 'Sin carga'
        GENERAL = '', 'General'

    checklist = models.ForeignKey(ChecklistVehiculo, on_delete=models.CASCADE, related_name='fotos')
    item = models.CharField(max_length=25, choices=Item.choices, blank=True)
    foto = models.ImageField(upload_to='flota/checklists/%Y/%m/')
    descripcion = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Foto de checklist'
        verbose_name_plural = 'Fotos de checklist'

    def __str__(self):
        return f'Foto — {self.checklist}'


class AlertaFlota(models.Model):
    class Tipo(models.TextChoices):
        CAMBIO_ACEITE = 'cambio_aceite', 'Cambio de aceite'
        CALIBRACION_LLANTAS = 'calibracion_llantas', 'Calibración de llantas'
        VENCIMIENTO_TENENCIA = 'vencimiento_tenencia', 'Vencimiento de tenencia'
        VENCIMIENTO_PLACAS = 'vencimiento_placas', 'Vencimiento de placas'
        MANTENIMIENTO_GENERAL = 'mantenimiento_general', 'Mantenimiento general'

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='alertas')
    tipo = models.CharField(max_length=25, choices=Tipo.choices)
    descripcion = models.TextField()
    km_alerta = models.IntegerField(null=True, blank=True)
    fecha_alerta = models.DateField(null=True, blank=True)
    activa = models.BooleanField(default=True)
    resuelta = models.BooleanField(default=False)
    resuelta_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='alertas_flota_resueltas',
    )
    resuelta_en = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Alerta de flota'
        verbose_name_plural = 'Alertas de flota'

    def __str__(self):
        return f'{self.vehiculo.nombre} — {self.get_tipo_display()}'
