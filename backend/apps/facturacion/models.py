from django.conf import settings
from django.db import models
from django.utils import timezone


class Factura(models.Model):
    class ModuloOrigen(models.TextChoices):
        INVENTARIO = 'inventario', 'Inventario'
        PROYECTOS = 'proyectos', 'Proyectos'
        FLOTA = 'flota', 'Flota'
        SANIDAD = 'sanidad', 'Sanidad'
        PERSONAL = 'personal', 'Personal'
        NOMINA = 'nomina', 'Nómina'
        COMBUSTIBLE = 'combustible', 'Combustible'
        IMPUESTOS = 'impuestos', 'Impuestos'
        OTRO = 'otro', 'Otro'

    folio_interno = models.CharField(max_length=20, unique=True, blank=True)
    numero_factura = models.CharField(max_length=100)
    fecha = models.DateField()
    concepto = models.CharField(max_length=300)
    importe = models.DecimalField(max_digits=12, decimal_places=2)
    archivo = models.FileField(upload_to='facturacion/%Y/%m/', null=True, blank=True)
    modulo_origen = models.CharField(max_length=20, choices=ModuloOrigen.choices, default=ModuloOrigen.OTRO)
    referencia_id = models.IntegerField(null=True, blank=True)
    referencia_descripcion = models.CharField(max_length=200, blank=True)
    mes_reporte = models.CharField(max_length=7, blank=True)
    notas = models.TextField(blank=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='facturas_registradas',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha', '-created_at']
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'

    def __str__(self):
        return f'{self.folio_interno} — {self.concepto} (${self.importe})'

    def save(self, *args, **kwargs):
        if not self.folio_interno:
            year = timezone.localdate().year
            prefix = f'FAC{year}-'
            ultima = Factura.objects.filter(folio_interno__startswith=prefix).order_by('-folio_interno').first()
            siguiente = int(ultima.folio_interno.rsplit('-', 1)[-1]) + 1 if ultima else 1
            self.folio_interno = f'{prefix}{siguiente:03d}'
        super().save(*args, **kwargs)


class RelacionMensual(models.Model):
    mes = models.CharField(max_length=7, unique=True)
    generado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='relaciones_facturacion_generadas',
    )
    total = models.DecimalField(max_digits=12, decimal_places=2)
    numero_facturas = models.IntegerField()
    archivo_excel = models.FileField(upload_to='facturacion/relaciones/%Y/%m/', null=True, blank=True)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-mes']
        verbose_name = 'Relación mensual'
        verbose_name_plural = 'Relaciones mensuales'

    def __str__(self):
        return f'Relación {self.mes} — {self.numero_facturas} facturas (${self.total})'
