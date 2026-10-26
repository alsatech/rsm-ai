from django.conf import settings
from django.db import models


class Proveedor(models.Model):
    class Tipo(models.TextChoices):
        MATERIAL = 'material', 'Proveedor de materiales'
        CONTRATISTA = 'contratista', 'Contratista'
        SERVICIO = 'servicio', 'Prestador de servicio'
        OTRO = 'otro', 'Otro'

    class Persona(models.TextChoices):
        FISICA = 'fisica', 'Persona física'
        MORAL = 'moral', 'Persona moral'

    class Moneda(models.TextChoices):
        MXN = 'MXN', 'Peso mexicano (MXN)'
        USD = 'USD', 'Dólar (USD)'
        OTRA = 'otra', 'Otra'

    tipo = models.CharField(max_length=15, choices=Tipo.choices, default=Tipo.MATERIAL)
    persona = models.CharField(max_length=10, choices=Persona.choices, blank=True)
    nombre = models.CharField(max_length=200)
    empresa = models.CharField(max_length=200, blank=True)
    especialidad = models.CharField(max_length=200, blank=True)
    rfc = models.CharField(max_length=20, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    pais = models.CharField(max_length=100, blank=True, default='México')
    moneda = models.CharField(max_length=5, choices=Moneda.choices, default=Moneda.MXN)
    tipo_cambio_referencia = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    trabajo_antes = models.BooleanField(default=False)
    detalle_trabajo_previo = models.TextField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.CharField(max_length=200, blank=True)
    banco = models.CharField(max_length=100, blank=True)
    cuenta_bancaria = models.CharField(max_length=30, blank=True)
    clabe = models.CharField(max_length=18, blank=True)
    notas = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='proveedores_creados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'

    def __str__(self):
        return f'{self.nombre} — {self.get_tipo_display()}'
