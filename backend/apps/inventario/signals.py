from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import MovimientoInventario


@receiver(post_save, sender=MovimientoInventario)
def alertar_stock_minimo(sender, instance, created, **kwargs):
    """Al registrar un movimiento, si el stock resultante llega al mínimo, dispara la alerta."""
    if not created:
        return

    producto = instance.producto
    if producto.stock_minimo and producto.stock_minimo > 0 and instance.stock_resultante <= producto.stock_minimo:
        from .tasks import alertar_stock_bajo_inmediato

        alertar_stock_bajo_inmediato.delay(producto.id)
