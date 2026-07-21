from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import MovimientoInventario, RecepcionMaterial, ReporteFaltanteDanio, SolicitudMaterial


@receiver(post_save, sender=MovimientoInventario)
def alertar_stock_minimo(sender, instance, created, **kwargs):
    """Al registrar un movimiento, si el stock resultante llega al mínimo, dispara la alerta."""
    if not created:
        return

    producto = instance.producto
    if producto.stock_minimo and producto.stock_minimo > 0 and instance.stock_resultante <= producto.stock_minimo:
        from .tasks import alertar_stock_bajo_inmediato

        alertar_stock_bajo_inmediato.delay(producto.id)


@receiver(pre_save, sender=RecepcionMaterial)
def validar_recibido_distinto_de_enviado(sender, instance, **kwargs):
    """El que recibe el material nunca puede ser quien lo envió — evita autoconfirmaciones."""
    if instance.recibido_por_id and instance.envio_id and instance.recibido_por_id == instance.envio.enviado_por_id:
        raise ValidationError('Quien recibe el material debe ser distinto de quien lo envió.')


@receiver(pre_save, sender=SolicitudMaterial)
def _cachear_estado_anterior_solicitud(sender, instance, **kwargs):
    if instance.pk:
        instance._estado_anterior = (
            SolicitudMaterial.objects.filter(pk=instance.pk).values_list('estado', flat=True).first()
        )
    else:
        instance._estado_anterior = None


@receiver(post_save, sender=SolicitudMaterial)
def generar_entradas_por_recepcion_completa(sender, instance, created, **kwargs):
    """Al marcar una solicitud como recibida_completa, genera entradas de inventario por cada ítem."""
    if created or instance.estado != SolicitudMaterial.Estado.RECIBIDA_COMPLETA:
        return
    if getattr(instance, '_estado_anterior', None) == SolicitudMaterial.Estado.RECIBIDA_COMPLETA:
        return  # ya se generaron las entradas antes, evita duplicarlas

    for item in instance.items.filter(producto__isnull=False, cantidad_recibida__gt=0):
        producto = item.producto
        stock_anterior = producto.stock_actual
        stock_resultante = stock_anterior + item.cantidad_recibida
        producto.stock_actual = stock_resultante
        producto.save(update_fields=['stock_actual', 'updated_at'])

        MovimientoInventario.objects.create(
            producto=producto,
            tipo=MovimientoInventario.Tipo.ENTRADA,
            cantidad=item.cantidad_recibida,
            stock_anterior=stock_anterior,
            stock_resultante=stock_resultante,
            responsable=instance.autorizado_por or instance.created_by,
            uso_descripcion=f'Entrada automática por recepción de la solicitud {instance.folio}',
            fecha_movimiento=timezone.localdate(),
        )


@receiver(post_save, sender=ReporteFaltanteDanio)
def alertar_reporte_faltante_danio(sender, instance, created, **kwargs):
    if not created:
        return

    from .tasks import alertar_nuevo_reporte_faltante_danio

    alertar_nuevo_reporte_faltante_danio.delay(instance.id)
