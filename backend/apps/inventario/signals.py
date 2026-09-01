from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import MovimientoInventario, RecepcionMaterial, ReporteFaltanteDanio


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


# Nota: la recepción de Campo YA NO genera movimientos/stock automáticamente. Lo que Campo
# reporta (fotos, audio, cantidades) queda pendiente hasta que Yajaira lo revisa contra la
# compra y da clic en "Dar entrada" — ver DarEntradaRecepcionView en views.py.


@receiver(post_save, sender=ReporteFaltanteDanio)
def alertar_reporte_faltante_danio(sender, instance, created, **kwargs):
    if not created:
        return

    from .tasks import alertar_nuevo_reporte_faltante_danio

    alertar_nuevo_reporte_faltante_danio.delay(instance.id)
