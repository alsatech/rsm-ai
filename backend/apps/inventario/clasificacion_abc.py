"""Clasificación ABC Multicriterio de productos.

Metodología (ver backend/media/inventario/ABC_Multicriterio_RSM.pdf): cada producto
recibe un score ponderado de 3 criterios — valor económico, frecuencia de uso y
criticidad operativa — y se clasifica por Pareto acumulado clásico (A hasta 80% del
score acumulado del catálogo, B hasta 95%, resto C).
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count
from django.utils import timezone

from .models import MovimientoInventario, Producto

PESO_VALOR_ECONOMICO = Decimal('0.4')
PESO_FRECUENCIA_USO = Decimal('0.4')
PESO_CRITICIDAD = Decimal('0.2')

CRITICIDAD_SCORE = {
    Producto.Criticidad.ALTA: Decimal('100'),
    Producto.Criticidad.MEDIA: Decimal('60'),
    Producto.Criticidad.BAJA: Decimal('20'),
}

UMBRAL_PARETO_A = Decimal('80')  # % acumulado del score hasta el cual se clasifica A
UMBRAL_PARETO_B = Decimal('95')  # % acumulado hasta el cual se clasifica B (resto = C)

DIAS_VENTANA_FRECUENCIA = 30


def _normalizar(valor, maximo):
    if not maximo:
        return Decimal('0')
    return (valor / maximo) * Decimal('100')


def _frecuencia_salidas_por_producto(producto_ids, hoy=None):
    hoy = hoy or timezone.localdate()
    desde = hoy - timedelta(days=DIAS_VENTANA_FRECUENCIA)
    filas = (
        MovimientoInventario.objects
        .filter(
            producto_id__in=producto_ids,
            tipo=MovimientoInventario.Tipo.SALIDA,
            validado=True,
            rechazado=False,
            fecha_movimiento__gte=desde,
            fecha_movimiento__lte=hoy,
        )
        .values('producto_id')
        .annotate(total=Count('id'))
    )
    return {fila['producto_id']: fila['total'] for fila in filas}


def calcular_clasificacion_abc(productos_qs=None):
    """Recalcula clase_abc/score_abc/clasificado_en de los productos activos y los persiste.

    Retorna la lista de productos actualizados, ordenada por score descendente.
    """
    productos = list(productos_qs if productos_qs is not None else Producto.objects.filter(activo=True))
    if not productos:
        return []

    frecuencias = _frecuencia_salidas_por_producto([p.id for p in productos])

    valores_economicos = {}
    for producto in productos:
        valores_economicos[producto.id] = producto.stock_actual * producto.costo_unitario

    maximo_valor = max(valores_economicos.values(), default=Decimal('0'))
    maximo_frecuencia = max(frecuencias.values(), default=0)

    calculados = []
    for producto in productos:
        norm_valor = _normalizar(valores_economicos[producto.id], maximo_valor)
        norm_frecuencia = _normalizar(Decimal(frecuencias.get(producto.id, 0)), Decimal(maximo_frecuencia))
        criticidad_score = CRITICIDAD_SCORE.get(producto.criticidad, CRITICIDAD_SCORE[Producto.Criticidad.MEDIA])

        score = (
            norm_valor * PESO_VALOR_ECONOMICO
            + norm_frecuencia * PESO_FRECUENCIA_USO
            + criticidad_score * PESO_CRITICIDAD
        )
        calculados.append((producto, score))

    calculados.sort(key=lambda item: (-item[1], item[0].codigo))

    suma_total_scores = sum((score for _, score in calculados), Decimal('0'))
    ahora = timezone.now()
    acumulado = Decimal('0')

    for producto, score in calculados:
        if suma_total_scores == 0:
            clase = Producto.ClaseABC.C
        else:
            acumulado += score
            porcentaje_acumulado = (acumulado / suma_total_scores) * Decimal('100')
            if porcentaje_acumulado <= UMBRAL_PARETO_A:
                clase = Producto.ClaseABC.A
            elif porcentaje_acumulado <= UMBRAL_PARETO_B:
                clase = Producto.ClaseABC.B
            else:
                clase = Producto.ClaseABC.C

        producto.clase_abc = clase
        producto.score_abc = score.quantize(Decimal('0.01'))
        producto.clasificado_en = ahora

    productos_ordenados = [producto for producto, _ in calculados]
    Producto.objects.bulk_update(productos_ordenados, ['clase_abc', 'score_abc', 'clasificado_en'])
    return productos_ordenados
