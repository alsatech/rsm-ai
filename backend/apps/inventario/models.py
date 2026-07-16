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
