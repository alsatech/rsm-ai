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
        OTRO = 'otro', 'Otro'

    class Estado(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        EN_TALLER = 'en_taller', 'En taller'
        DE_BAJA = 'de_baja', 'De baja'

    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField()
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
    """Checklist de salida o llegada — el responsable es quien usó el vehículo."""

    class TipoReporte(models.TextChoices):
        SALIDA = 'salida', 'Salida'
        LLEGADA = 'llegada', 'Llegada'

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name='checklists')
    tipo_reporte = models.CharField(max_length=10, choices=TipoReporte.choices)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='checklists_flota'
    )
    fecha_hora = models.DateTimeField(default=timezone.now)
    km_reporte = models.DecimalField(max_digits=10, decimal_places=2)

    # Inspección visual
    carroceria_pintura = models.BooleanField(default=False)
    parabrisas_vidrios = models.BooleanField(default=False)
    neumaticos_presion = models.BooleanField(default=False)
    luces_delanteras_traseras = models.BooleanField(default=False)
    interiores_asientos = models.BooleanField(default=False)
    nivel_combustible = models.IntegerField()

    # Revisión mecánica
    nivel_aceite = models.BooleanField(default=False)
    nivel_refrigerante = models.BooleanField(default=False)
    nivel_liquido_frenos = models.BooleanField(default=False)
    frenos_respuesta = models.BooleanField(default=False)
    direccion_volante = models.BooleanField(default=False)
    suspension_amortiguadores = models.BooleanField(default=False)
    filtro_aire = models.BooleanField(default=False)

    # Accesorios
    gato = models.BooleanField(default=False)
    cruzeta = models.BooleanField(default=False)
    llanta_refaccion = models.BooleanField(default=False)
    caja_herramientas = models.BooleanField(default=False)
    cables_corriente = models.BooleanField(default=False)

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

    ITEMS_INSPECCION = (
        'carroceria_pintura', 'parabrisas_vidrios', 'neumaticos_presion',
        'luces_delanteras_traseras', 'interiores_asientos',
        'nivel_aceite', 'nivel_refrigerante', 'nivel_liquido_frenos',
        'frenos_respuesta', 'direccion_volante', 'suspension_amortiguadores', 'filtro_aire',
        'gato', 'cruzeta', 'llanta_refaccion', 'caja_herramientas', 'cables_corriente',
    )

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = 'Checklist de vehículo'
        verbose_name_plural = 'Checklists de vehículos'

    def __str__(self):
        nombre = self.responsable.get_full_name() or self.responsable.username
        return f'{self.vehiculo.nombre} — {self.get_tipo_reporte_display()} ({nombre}, {self.fecha_hora:%Y-%m-%d})'

    def items_verificados(self):
        return sum(1 for campo in self.ITEMS_INSPECCION if getattr(self, campo))


class FotoChecklist(models.Model):
    checklist = models.ForeignKey(ChecklistVehiculo, on_delete=models.CASCADE, related_name='fotos')
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
