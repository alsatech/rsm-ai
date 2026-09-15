from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Factura


@receiver(pre_save, sender=Factura)
def calcular_mes_reporte(sender, instance, **kwargs):
    """mes_reporte siempre se deriva de fecha — nunca se captura a mano, para que
    filtrar/agrupar por mes sea consistente aunque la fecha se edite después."""
    if instance.fecha:
        instance.mes_reporte = f'{instance.fecha.year}-{instance.fecha.month:02d}'
