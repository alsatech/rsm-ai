from django.conf import settings
from django.db import models
from django.utils import timezone

MONTO_REQUIERE_AUTORIZACION = 50000


class Contratista(models.Model):
    nombre = models.CharField(max_length=200)
    empresa = models.CharField(max_length=200, blank=True)
    especialidad = models.CharField(max_length=200)  # Albañilería, Electricidad, Plomería, Herrería...
    telefono = models.CharField(max_length=20, blank=True)
    email = models.CharField(max_length=200, blank=True)
    rfc = models.CharField(max_length=20, blank=True)
    notas = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='contratistas_creados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Contratista'
        verbose_name_plural = 'Contratistas'

    def __str__(self):
        return f'{self.nombre} — {self.especialidad}'


class Proyecto(models.Model):
    class Estado(models.TextChoices):
        BORRADOR = 'borrador', 'Borrador'
        AUTORIZADO = 'autorizado', 'Autorizado'
        EN_PROGRESO = 'en_progreso', 'En progreso'
        PAUSADO = 'pausado', 'Pausado'
        COMPLETADO = 'completado', 'Completado'
        CANCELADO = 'cancelado', 'Cancelado'

    folio = models.CharField(max_length=20, unique=True, blank=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField()
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.BORRADOR)
    presupuesto_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    requiere_autorizacion = models.BooleanField(default=False)
    autorizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='proyectos_autorizados'
    )
    autorizado_en = models.DateTimeField(null=True, blank=True)
    notas_autorizacion = models.TextField(blank=True)
    fecha_inicio_estimada = models.DateField(null=True, blank=True)
    fecha_inicio_real = models.DateField(null=True, blank=True)
    fecha_fin_estimada = models.DateField(null=True, blank=True)
    fecha_fin_real = models.DateField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='proyectos_creados')
    asignado_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='proyectos_asignados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Proyecto'
        verbose_name_plural = 'Proyectos'

    def __str__(self):
        return f'{self.folio} — {self.nombre}'

    def save(self, *args, **kwargs):
        if not self.folio:
            year = timezone.localdate().year
            prefix = f'PRY{year}-'
            ultimo = Proyecto.objects.filter(folio__startswith=prefix).order_by('-folio').first()
            siguiente = int(ultimo.folio.rsplit('-', 1)[-1]) + 1 if ultimo else 1
            self.folio = f'{prefix}{siguiente:03d}'
        super().save(*args, **kwargs)


class CotizacionManoObra(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        APROBADA = 'aprobada', 'Aprobada'
        RECHAZADA = 'rechazada', 'Rechazada'

    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='cotizaciones')
    contratista = models.ForeignKey(Contratista, on_delete=models.PROTECT, related_name='cotizaciones')
    descripcion_trabajo = models.TextField()
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.PENDIENTE)
    aprobada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='cotizaciones_aprobadas'
    )
    aprobada_en = models.DateTimeField(null=True, blank=True)
    notas = models.TextField(blank=True)
    archivo_cotizacion = models.FileField(upload_to='proyectos/cotizaciones/%Y/%m/', null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='cotizaciones_creadas')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Cotización de mano de obra'
        verbose_name_plural = 'Cotizaciones de mano de obra'

    def __str__(self):
        return f'{self.contratista.nombre} — ${self.monto} ({self.get_estado_display()})'


class ItemProyecto(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='items')
    producto_ref = models.ForeignKey(
        'inventario.Producto', null=True, blank=True, on_delete=models.SET_NULL, related_name='items_proyecto'
    )
    codigo_proyecto = models.CharField(max_length=30, blank=True)
    descripcion = models.CharField(max_length=200)
    unidad = models.CharField(max_length=30)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['codigo_proyecto']
        verbose_name = 'Ítem de proyecto'
        verbose_name_plural = 'Ítems de proyecto'

    def __str__(self):
        return f'{self.codigo_proyecto} — {self.descripcion}'

    def save(self, *args, **kwargs):
        if not self.codigo_proyecto:
            prefijo = f'PRY{self.proyecto_id:03d}'
            if self.producto_ref_id:
                self.codigo_proyecto = f'{prefijo}-{self.producto_ref.codigo}'
            else:
                existentes = ItemProyecto.objects.filter(
                    proyecto_id=self.proyecto_id, codigo_proyecto__startswith=f'{prefijo}-NUEVO-'
                ).count()
                self.codigo_proyecto = f'{prefijo}-NUEVO-{existentes + 1:03d}'
        super().save(*args, **kwargs)


class MovimientoProyecto(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = 'entrada', 'Entrada'
        SALIDA = 'salida', 'Salida'
        DEVOLUCION = 'devolucion', 'Devolución'

    item = models.ForeignKey(ItemProyecto, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    stock_anterior = models.DecimalField(max_digits=10, decimal_places=2)
    stock_resultante = models.DecimalField(max_digits=10, decimal_places=2)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='movimientos_proyecto'
    )
    descripcion_uso = models.TextField(blank=True)
    compra_ref = models.ForeignKey(
        'CompraProyecto', null=True, blank=True, on_delete=models.SET_NULL, related_name='movimientos'
    )
    fecha_movimiento = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Movimiento de proyecto'
        verbose_name_plural = 'Movimientos de proyecto'

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.item.codigo_proyecto} ({self.cantidad})'


class CompraProyecto(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE_AUTORIZACION = 'pendiente_autorizacion', 'Pendiente de autorización'
        AUTORIZADA = 'autorizada', 'Autorizada'
        RECHAZADA = 'rechazada', 'Rechazada'
        EN_PROCESO = 'en_proceso', 'En proceso'
        COMPLETADA = 'completada', 'Completada'

    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='compras')
    folio_compra = models.CharField(max_length=20, unique=True, blank=True)
    contratista_proveedor = models.ForeignKey(
        Contratista, null=True, blank=True, on_delete=models.SET_NULL, related_name='compras_proyecto'
    )
    proveedor_nombre = models.CharField(max_length=200, blank=True)
    descripcion = models.TextField()
    monto_total = models.DecimalField(max_digits=12, decimal_places=2)
    requiere_autorizacion = models.BooleanField(default=False)
    autorizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='compras_proyecto_autorizadas'
    )
    autorizado_en = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=25, choices=Estado.choices, default=Estado.PENDIENTE_AUTORIZACION)
    fecha_compra = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='compras_proyecto_creadas')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Compra de proyecto'
        verbose_name_plural = 'Compras de proyecto'

    def __str__(self):
        return f'{self.folio_compra} — ${self.monto_total}'

    def save(self, *args, **kwargs):
        if not self.folio_compra:
            year = timezone.localdate().year
            prefix = f'CMP{year}-'
            ultima = CompraProyecto.objects.filter(folio_compra__startswith=prefix).order_by('-folio_compra').first()
            siguiente = int(ultima.folio_compra.rsplit('-', 1)[-1]) + 1 if ultima else 1
            self.folio_compra = f'{prefix}{siguiente:03d}'
        super().save(*args, **kwargs)


class FotoCompra(models.Model):
    compra = models.ForeignKey(CompraProyecto, on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='proyectos/compras/%Y/%m/')
    descripcion = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='fotos_compra_proyecto')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Foto de compra'
        verbose_name_plural = 'Fotos de compra'

    def __str__(self):
        return f'Foto — compra #{self.compra_id}'


class AvanceProyecto(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='avances')
    porcentaje = models.PositiveSmallIntegerField()
    descripcion = models.TextField()
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='avances_registrados')
    fecha_avance = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_avance', '-created_at']
        verbose_name = 'Avance de proyecto'
        verbose_name_plural = 'Avances de proyecto'

    def __str__(self):
        return f'{self.proyecto.folio} — {self.porcentaje}%'


class FotoAvance(models.Model):
    avance = models.ForeignKey(AvanceProyecto, on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='proyectos/avances/%Y/%m/')
    descripcion = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='fotos_avance')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Foto de avance'
        verbose_name_plural = 'Fotos de avance'

    def __str__(self):
        return f'Foto — avance #{self.avance_id}'


class DevolucionInventario(models.Model):
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='devoluciones')
    item = models.ForeignKey(ItemProyecto, on_delete=models.PROTECT, related_name='devoluciones')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    producto_inventario = models.ForeignKey(
        'inventario.Producto', on_delete=models.PROTECT, related_name='devoluciones_proyecto'
    )
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='devoluciones_registradas')
    fecha = models.DateField(default=timezone.localdate)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Devolución a inventario'
        verbose_name_plural = 'Devoluciones a inventario'

    def __str__(self):
        return f'Devolución {self.item.codigo_proyecto} → {self.producto_inventario.codigo} ({self.cantidad})'
