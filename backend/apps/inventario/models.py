from django.conf import settings
from django.db import models
from django.utils import timezone


class CategoriaInventario(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7)  # hex color para UI
    icono = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Categoría de inventario'
        verbose_name_plural = 'Categorías de inventario'

    def __str__(self):
        return self.nombre


class Ubicacion(models.Model):
    class Nombre(models.TextChoices):
        BODEGA = 'bodega', 'Bodega'
        GRANERO = 'granero', 'Granero'
        HANGAR = 'hangar', 'Hangar'

    nombre = models.CharField(max_length=20, choices=Nombre.choices, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Ubicación'
        verbose_name_plural = 'Ubicaciones'

    def __str__(self):
        return self.get_nombre_display()


class Producto(models.Model):
    class UnidadMedida(models.TextChoices):
        PIEZA = 'pieza', 'Pieza'
        SACO = 'saco', 'Saco'
        ROLLO = 'rollo', 'Rollo'
        LITRO = 'litro', 'Litro'
        METRO = 'metro', 'Metro'
        CAJA = 'caja', 'Caja'
        KILOGRAMO = 'kilogramo', 'Kilogramo'
        PAR = 'par', 'Par'
        JUEGO = 'juego', 'Juego'
        OTRO = 'otro', 'Otro'

    codigo = models.CharField(max_length=20, unique=True)
    descripcion = models.CharField(max_length=200)
    categoria = models.ForeignKey(CategoriaInventario, on_delete=models.PROTECT, related_name='productos')
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.PROTECT, related_name='productos')
    unidad_medida = models.CharField(max_length=15, choices=UnidadMedida.choices, default=UnidadMedida.PIEZA)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    notas = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['codigo']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

    def __str__(self):
        return f'{self.codigo} — {self.descripcion}'

    @property
    def en_stock_bajo(self):
        return self.stock_minimo is not None and self.stock_minimo > 0 and self.stock_actual <= self.stock_minimo


class MovimientoInventario(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = 'entrada', 'Entrada'
        SALIDA = 'salida', 'Salida'

    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    stock_anterior = models.DecimalField(max_digits=10, decimal_places=2)
    stock_resultante = models.DecimalField(max_digits=10, decimal_places=2)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='movimientos_inventario'
    )
    uso_descripcion = models.TextField(blank=True)  # "¿Para qué se usó?"
    vehiculo_codigo = models.CharField(max_length=20, blank=True)  # combustibles: SM-A001, SM-R003, etc.
    proyecto_referencia = models.CharField(max_length=200, blank=True)
    fecha_movimiento = models.DateField(default=timezone.localdate)
    fecha_hora_registro = models.DateTimeField(auto_now_add=True)
    validado = models.BooleanField(default=False)
    validado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='movimientos_validados',
    )
    rechazado = models.BooleanField(default=False)
    notas = models.TextField(blank=True)
    foto_evidencia = models.ImageField(upload_to='inventario/%Y/%m/', null=True, blank=True)

    class Meta:
        ordering = ['-fecha_hora_registro']
        verbose_name = 'Movimiento de inventario'
        verbose_name_plural = 'Movimientos de inventario'

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.producto.codigo} ({self.cantidad})'


class SolicitudMaterial(models.Model):
    class Area(models.TextChoices):
        CAMPO = 'campo', 'Campo'
        HIDRAULICA = 'hidraulica', 'Hidráulica'
        CONSTRUCCION = 'construccion', 'Construcción'
        GANADO = 'ganado', 'Ganado'
        FLOTA = 'flota', 'Flota'
        ADMINISTRACION = 'administracion', 'Administración'
        OTRO = 'otro', 'Otro'

    class Estado(models.TextChoices):
        BORRADOR = 'borrador', 'Borrador'
        ENVIADA = 'enviada', 'Enviada'
        AUTORIZADA = 'autorizada', 'Autorizada'
        RECHAZADA = 'rechazada', 'Rechazada'
        EN_COMPRA = 'en_compra', 'En compra'
        ENVIADA_RANCHO = 'enviada_rancho', 'Enviada al rancho'
        RECIBIDA_PARCIAL = 'recibida_parcial', 'Recibida parcial'
        RECIBIDA_COMPLETA = 'recibida_completa', 'Recibida completa'

    folio = models.CharField(max_length=20, unique=True, blank=True)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='solicitudes')
    area = models.CharField(max_length=20, choices=Area.choices)
    descripcion_necesidad = models.TextField()
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.BORRADOR)
    autorizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='solicitudes_autorizadas'
    )
    autorizado_en = models.DateTimeField(null=True, blank=True)
    notas_autorizacion = models.TextField(blank=True)
    fecha_requerida = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='solicitudes_creadas'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Solicitud de material'
        verbose_name_plural = 'Solicitudes de material'

    def __str__(self):
        return f'{self.folio} — {self.get_area_display()}'

    def save(self, *args, **kwargs):
        if not self.folio:
            year = timezone.localdate().year
            prefix = f'SM-{year}-'
            ultimo = (
                SolicitudMaterial.objects.filter(folio__startswith=prefix).order_by('-folio').first()
            )
            siguiente = int(ultimo.folio.rsplit('-', 1)[-1]) + 1 if ultimo else 1
            self.folio = f'{prefix}{siguiente:03d}'
        super().save(*args, **kwargs)


class ItemSolicitud(models.Model):
    solicitud = models.ForeignKey(SolicitudMaterial, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.PROTECT, related_name='items_solicitados')
    descripcion_libre = models.CharField(max_length=200, blank=True)
    cantidad_solicitada = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad_enviada = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cantidad_recibida = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unidad = models.CharField(max_length=30, blank=True)
    notas = models.TextField(blank=True)
    es_producto_nuevo = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']
        verbose_name = 'Ítem de solicitud'
        verbose_name_plural = 'Ítems de solicitud'

    def __str__(self):
        nombre = self.producto.descripcion if self.producto else self.descripcion_libre
        return f'{nombre} x{self.cantidad_solicitada}'


class EnvioMaterial(models.Model):
    class Estado(models.TextChoices):
        EN_TRANSITO = 'en_transito', 'En tránsito'
        ENTREGADO = 'entregado', 'Entregado'
        ENTREGADO_PARCIAL = 'entregado_parcial', 'Entregado parcial'

    solicitud = models.ForeignKey(SolicitudMaterial, on_delete=models.CASCADE, related_name='envios')
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='envios_realizados'
    )
    fecha_envio = models.DateField(default=timezone.localdate)
    hora_envio = models.TimeField(null=True, blank=True)
    vehiculo = models.CharField(max_length=100, blank=True)
    notas_envio = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.EN_TRANSITO)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Envío de material'
        verbose_name_plural = 'Envíos de material'

    def __str__(self):
        return f'Envío {self.solicitud.folio} — {self.get_estado_display()}'


class FotoEnvio(models.Model):
    class Momento(models.TextChoices):
        SALIDA = 'salida', 'Salida'
        LLEGADA = 'llegada', 'Llegada'

    envio = models.ForeignKey(EnvioMaterial, on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='inventario/envios/%Y/%m/')
    descripcion = models.CharField(max_length=200, blank=True)
    momento = models.CharField(max_length=10, choices=Momento.choices)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Foto de envío'
        verbose_name_plural = 'Fotos de envío'

    def __str__(self):
        return f'Foto {self.get_momento_display()} — envío #{self.envio_id}'


class RecepcionMaterial(models.Model):
    class EstadoGeneral(models.TextChoices):
        COMPLETO = 'completo', 'Completo'
        PARCIAL = 'parcial', 'Parcial'
        CON_DANIOS = 'con_danios', 'Con daños'

    envio = models.ForeignKey(EnvioMaterial, on_delete=models.CASCADE, related_name='recepciones')
    recibido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='recepciones_realizadas'
    )
    fecha_recepcion = models.DateField(default=timezone.localdate)
    hora_recepcion = models.TimeField(null=True, blank=True)
    estado_general = models.CharField(max_length=15, choices=EstadoGeneral.choices)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Recepción de material'
        verbose_name_plural = 'Recepciones de material'

    def __str__(self):
        return f'Recepción {self.get_estado_general_display()} — envío #{self.envio_id}'

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.recibido_por_id and self.envio_id and self.recibido_por_id == self.envio.enviado_por_id:
            raise ValidationError('Quien recibe el material debe ser distinto de quien lo envió.')


class ItemRecepcion(models.Model):
    class EstadoItem(models.TextChoices):
        OK = 'ok', 'OK'
        DANIADO = 'daniado', 'Dañado'
        FALTANTE = 'faltante', 'Faltante'

    recepcion = models.ForeignKey(RecepcionMaterial, on_delete=models.CASCADE, related_name='items')
    item_solicitud = models.ForeignKey(ItemSolicitud, on_delete=models.PROTECT, related_name='recepciones')
    cantidad_recibida = models.DecimalField(max_digits=10, decimal_places=2)
    estado_item = models.CharField(max_length=10, choices=EstadoItem.choices)
    notas = models.TextField(blank=True)
    foto = models.ImageField(upload_to='inventario/recepciones/%Y/%m/', null=True, blank=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Ítem de recepción'
        verbose_name_plural = 'Ítems de recepción'

    def __str__(self):
        return f'{self.item_solicitud} — {self.get_estado_item_display()}'


class ReporteFaltanteDanio(models.Model):
    class Tipo(models.TextChoices):
        FALTANTE = 'faltante', 'Faltante'
        DANIO = 'danio', 'Daño'
        IRREGULARIDAD = 'irregularidad', 'Irregularidad'

    class Estado(models.TextChoices):
        ABIERTO = 'abierto', 'Abierto'
        EN_SEGUIMIENTO = 'en_seguimiento', 'En seguimiento'
        RESUELTO = 'resuelto', 'Resuelto'

    producto = models.ForeignKey(
        Producto, null=True, blank=True, on_delete=models.SET_NULL, related_name='reportes_faltante_danio'
    )
    descripcion = models.TextField()
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    reportado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='reportes_faltante_danio'
    )
    ubicacion = models.ForeignKey(Ubicacion, null=True, blank=True, on_delete=models.SET_NULL)
    foto = models.ImageField(upload_to='inventario/reportes/%Y/%m/', null=True, blank=True)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.ABIERTO)
    resuelto_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reportes_resueltos',
    )
    resuelto_en = models.DateTimeField(null=True, blank=True)
    notas_resolucion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Reporte de faltante o daño'
        verbose_name_plural = 'Reportes de faltantes y daños'

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.descripcion[:40]}'
