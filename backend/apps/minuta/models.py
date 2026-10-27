from django.conf import settings
from django.db import models


class Minuta(models.Model):
    """Minuta diaria generada con un clic a partir de hidráulica, pendientes, flota y ganado.

    No se duplican los datos de los demás módulos — se agregan en vivo (ver services.py)
    cada vez que se genera o se vuelve a generar. Este modelo solo deja constancia de
    quién/cuándo la generó, las notas de la junta y el PDF resultante.
    """

    fecha = models.DateField(unique=True)
    generada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='minutas_generadas',
    )
    notas = models.TextField(blank=True)
    archivo_pdf = models.FileField(upload_to='minutas/%Y/%m/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Minuta'
        verbose_name_plural = 'Minutas'

    def __str__(self):
        return f'Minuta {self.fecha}'
