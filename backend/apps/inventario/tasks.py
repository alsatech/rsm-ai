from celery import shared_task
from django.db.models import F

DESTINATARIOS_ALERTA = 'Erik, Administrador y Superadmin'


@shared_task
def alertar_stock_bajo_inmediato(producto_id):
    """Se dispara al registrar un movimiento que deja un producto en o bajo su stock mínimo.

    Por ahora solo imprime en consola — WhatsApp queda fuera del SLA actual.
    """
    from .models import Producto

    try:
        producto = Producto.objects.get(pk=producto_id)
    except Producto.DoesNotExist:
        return

    print(
        f'[ALERTA INVENTARIO] {producto.codigo} — {producto.descripcion}: '
        f'stock {producto.stock_actual} {producto.get_unidad_medida_display()} '
        f'(mínimo {producto.stock_minimo}). Notificar a {DESTINATARIOS_ALERTA}.'
    )


@shared_task
def revisar_stock_minimo():
    """Corre diariamente a las 5 PM — Yajaira actualiza el inventario entre 4:30 y 5:00 PM.

    Lista en consola todos los productos que requieren reabasto.
    """
    from .models import Producto

    productos = Producto.objects.filter(
        activo=True, stock_minimo__gt=0, stock_actual__lte=F('stock_minimo'),
    ).order_by('codigo')

    if not productos:
        print('[INVENTARIO] Revisión de stock mínimo: sin productos en alerta.')
        return

    print(f'[INVENTARIO] Revisión de stock mínimo — {productos.count()} producto(s) requieren reabasto:')
    for producto in productos:
        print(
            f'  - {producto.codigo} | {producto.descripcion} | '
            f'stock: {producto.stock_actual} | mínimo: {producto.stock_minimo}'
        )
