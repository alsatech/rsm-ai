from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import DevolucionInventario, MovimientoProyecto, Proyecto, MONTO_REQUIERE_AUTORIZACION


@receiver(pre_save, sender=Proyecto)
def marcar_requiere_autorizacion(sender, instance, **kwargs):
    """Presupuesto > $50,000 MXN siempre requiere autorización de Alberto (superadmin)."""
    instance.requiere_autorizacion = bool(
        instance.presupuesto_total and instance.presupuesto_total > MONTO_REQUIERE_AUTORIZACION
    )


@receiver(post_save, sender=DevolucionInventario)
def procesar_devolucion_inventario(sender, instance, created, **kwargs):
    """Al registrar la devolución de material sobrante: descuenta del inventario del proyecto,
    deja constancia en MovimientoProyecto y da entrada al inventario general."""
    if not created:
        return

    from apps.inventario.models import MovimientoInventario

    item = instance.item
    stock_anterior_item = item.stock_actual
    stock_resultante_item = stock_anterior_item - instance.cantidad
    item.stock_actual = stock_resultante_item
    item.save(update_fields=['stock_actual', 'updated_at'])

    MovimientoProyecto.objects.create(
        item=item,
        tipo=MovimientoProyecto.Tipo.DEVOLUCION,
        cantidad=instance.cantidad,
        stock_anterior=stock_anterior_item,
        stock_resultante=stock_resultante_item,
        responsable=instance.registrado_por,
        descripcion_uso=f'Devolución al inventario general. {instance.notas}'.strip(),
        fecha_movimiento=instance.fecha,
    )

    producto = instance.producto_inventario
    stock_anterior_prod = producto.stock_actual
    stock_resultante_prod = stock_anterior_prod + instance.cantidad
    producto.stock_actual = stock_resultante_prod
    producto.save(update_fields=['stock_actual', 'updated_at'])

    MovimientoInventario.objects.create(
        producto=producto,
        tipo=MovimientoInventario.Tipo.ENTRADA,
        cantidad=instance.cantidad,
        stock_anterior=stock_anterior_prod,
        stock_resultante=stock_resultante_prod,
        responsable=instance.registrado_por,
        uso_descripcion=f'Devolución de material sobrante del proyecto {item.proyecto.folio}',
        fecha_movimiento=instance.fecha,
        validado=True,
        validado_por=instance.registrado_por,
    )
