from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import AlertaFlota, ChecklistVehiculo, Vehiculo

DIAS_AVISO_VENCIMIENTO = 30


@receiver(post_save, sender=ChecklistVehiculo)
def actualizar_km_al_llegar(sender, instance, created, **kwargs):
    """Al registrar un checklist de llegada, sube el kilometraje del vehículo si avanzó."""
    if not created or instance.tipo_reporte != ChecklistVehiculo.TipoReporte.LLEGADA:
        return

    vehiculo = instance.vehiculo
    if instance.km_reporte > vehiculo.kilometraje_actual:
        vehiculo.kilometraje_actual = instance.km_reporte
        vehiculo.save(update_fields=['kilometraje_actual', 'updated_at'])


@receiver(post_save, sender=Vehiculo)
def crear_alertas_vencimiento(sender, instance, **kwargs):
    """Si tenencia o placas vencen en los próximos 30 días, crea la alerta correspondiente."""
    limite = timezone.now().date() + timedelta(days=DIAS_AVISO_VENCIMIENTO)

    revisiones = (
        (instance.fecha_vencimiento_tenencia, AlertaFlota.Tipo.VENCIMIENTO_TENENCIA, 'tenencia'),
        (instance.fecha_vencimiento_placas, AlertaFlota.Tipo.VENCIMIENTO_PLACAS, 'placas'),
    )

    for fecha_vencimiento, tipo, etiqueta in revisiones:
        if not fecha_vencimiento or fecha_vencimiento > limite:
            continue

        ya_existe = AlertaFlota.objects.filter(
            vehiculo=instance, tipo=tipo, activa=True, resuelta=False,
        ).exists()
        if ya_existe:
            continue

        AlertaFlota.objects.create(
            vehiculo=instance,
            tipo=tipo,
            descripcion=f'La {etiqueta} de {instance.nombre} vence el {fecha_vencimiento:%Y-%m-%d}.',
            fecha_alerta=fecha_vencimiento,
        )
