from io import BytesIO

from django.db import models

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import MovimientoInventario, Producto

_STYLES = getSampleStyleSheet()
_TITULO = _STYLES['Title']
_SECCION = ParagraphStyle('seccion', parent=_STYLES['Heading2'], spaceBefore=14, spaceAfter=6)
_CELDA = ParagraphStyle('celda', parent=_STYLES['BodyText'], fontSize=8, leading=10)
_VACIO = ParagraphStyle('vacio', parent=_STYLES['BodyText'], textColor=colors.grey)

_ENCABEZADO_ESTILO = TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f6b3e')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f4f4')]),
])


def _p(texto):
    return Paragraph(str(texto) if texto not in (None, '') else '—', _CELDA)


def _estado_stock(producto):
    if producto.stock_actual <= 0:
        return 'Crítico'
    if producto.stock_minimo and producto.stock_minimo > 0 and producto.stock_actual <= producto.stock_minimo:
        return 'Bajo'
    return 'Normal'


def _link_evidencia(archivo, request):
    if not archivo:
        return _p('—')
    url = request.build_absolute_uri(archivo.url)
    return Paragraph(f'<a href="{url}" color="#1f6b3e">Ver foto</a>', _CELDA)


def _destino_salida(movimiento):
    """Vehículo (combustibles) o proyecto de referencia — lo que el documento de Yajaira
    llama 'destino o lugar donde será utilizado el artículo'. uso_descripcion es el motivo,
    no el destino, así que van en columnas separadas."""
    if movimiento.vehiculo_codigo:
        etiqueta = 'Generador' if movimiento.generador_id else 'Vehículo'
        return f'{etiqueta}: {movimiento.vehiculo_codigo}'
    if movimiento.proyecto_referencia:
        return movimiento.proyecto_referencia
    return '—'


def _tabla(encabezados, filas, col_widths):
    data = [encabezados] + filas
    tabla = Table(data, colWidths=col_widths, repeatRows=1)
    tabla.setStyle(_ENCABEZADO_ESTILO)
    return tabla


def generar_pdf_reporte_diario(fecha, request):
    """Arma el PDF del corte diario: por comprar, entradas del día, salidas del día e
    inventario actualizado. Yajaira lo descarga y lo reenvía por correo manualmente a
    DG/GP/GDA — ver ReporteDiarioView."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
    )
    story = [
        Paragraph('Reserva Santa Margarita', _TITULO),
        Paragraph(f'Reporte diario de inventario — {fecha.strftime("%d/%m/%Y")}', _STYLES['Heading3']),
        Spacer(1, 0.3 * cm),
    ]

    # Por comprar — misma query que AlertasStockView.
    por_comprar = Producto.objects.filter(
        activo=True, stock_minimo__gt=0, stock_actual__lte=models.F('stock_minimo'),
    ).select_related('categoria', 'ubicacion').order_by('codigo')
    story.append(Paragraph('Por comprar', _SECCION))
    if por_comprar:
        filas = [
            [_p(p.codigo), _p(p.descripcion), _p(p.stock_actual), _p(p.stock_minimo), _p(p.stock_minimo - p.stock_actual)]
            for p in por_comprar
        ]
        story.append(_tabla(
            [_p('Código'), _p('Descripción'), _p('Stock actual'), _p('Stock mínimo'), _p('Faltante')],
            filas, [2.3 * cm, 6.5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm],
        ))
    else:
        story.append(Paragraph('Sin productos por debajo del stock mínimo.', _VACIO))

    # Entradas / salidas del día.
    movimientos_dia = MovimientoInventario.objects.filter(fecha_movimiento=fecha).select_related(
        'producto', 'responsable', 'vehiculo', 'generador',
    ).order_by('producto__codigo')

    entradas = [m for m in movimientos_dia if m.tipo == MovimientoInventario.Tipo.ENTRADA]
    story.append(Paragraph('Entradas del día', _SECCION))
    if entradas:
        filas = [
            [
                _p(m.producto.codigo), _p(m.producto.descripcion), _p(m.cantidad),
                _p(m.responsable.get_full_name() or m.responsable.username),
                _p(m.uso_descripcion), _link_evidencia(m.foto_evidencia, request),
            ]
            for m in entradas
        ]
        story.append(_tabla(
            [_p('Código'), _p('Descripción'), _p('Cantidad'), _p('Responsable'), _p('Origen / proveedor'), _p('Evidencia')],
            filas, [2 * cm, 4.5 * cm, 1.8 * cm, 2.7 * cm, 3.3 * cm, 2 * cm],
        ))
    else:
        story.append(Paragraph('Sin entradas registradas este día.', _VACIO))

    salidas = [m for m in movimientos_dia if m.tipo == MovimientoInventario.Tipo.SALIDA]
    story.append(Paragraph('Salidas del día', _SECCION))
    if salidas:
        # Destino (vehículo o proyecto) va separado de uso_descripcion, que es el motivo —
        # ver _destino_salida.
        filas = [
            [
                _p(m.producto.codigo), _p(m.producto.descripcion), _p(m.cantidad),
                _p(m.responsable.get_full_name() or m.responsable.username),
                _p(m.uso_descripcion), _p(_destino_salida(m)), _link_evidencia(m.foto_evidencia, request),
            ]
            for m in salidas
        ]
        story.append(_tabla(
            [_p('Código'), _p('Descripción'), _p('Cantidad'), _p('Responsable'), _p('Motivo'), _p('Destino'), _p('Evidencia')],
            filas, [1.8 * cm, 3.8 * cm, 1.5 * cm, 2.3 * cm, 2.8 * cm, 2.8 * cm, 1.8 * cm],
        ))
    else:
        story.append(Paragraph('Sin salidas registradas este día.', _VACIO))

    # Inventario actualizado — snapshot completo.
    productos = Producto.objects.filter(activo=True).select_related('categoria', 'ubicacion').order_by('codigo')
    story.append(Paragraph('Inventario actualizado', _SECCION))
    if productos:
        filas = [
            [
                _p(p.codigo), _p(p.descripcion), _p(p.categoria.nombre), _p(p.ubicacion.get_nombre_display()),
                _p(p.get_unidad_medida_display()), _p(p.stock_actual), _p(p.stock_minimo), _p(_estado_stock(p)),
            ]
            for p in productos
        ]
        story.append(_tabla(
            [_p('Código'), _p('Descripción'), _p('Categoría'), _p('Ubicación'), _p('Unidad'), _p('Stock'), _p('Mínimo'), _p('Estado')],
            filas, [1.8 * cm, 3.8 * cm, 2.3 * cm, 1.8 * cm, 1.8 * cm, 1.6 * cm, 1.6 * cm, 1.8 * cm],
        ))
    else:
        story.append(Paragraph('Sin productos activos en el catálogo.', _VACIO))

    doc.build(story)
    return buffer.getvalue()


def _fmt(valor):
    """Cantidad sin ceros de relleno: 9.00 -> 9, 2.50 -> 2.5."""
    texto = f'{valor:f}'
    return texto.rstrip('0').rstrip('.') if '.' in texto else texto


def calcular_lista_compras(desde, hasta):
    """Alacena: lo que hay que comprar para volver al stock (stock_minimo).

    La existencia es la que había al cierre de `hasta`: se parte de stock_actual y se revierte
    el efecto de los movimientos posteriores (los cancelados ya se revirtieron, se ignoran).
    `consumo` son las salidas del rango desde–hasta."""
    productos = Producto.objects.filter(
        activo=True, ubicacion__nombre='alacena', stock_minimo__gt=0,
    ).order_by('codigo')

    posteriores = {}
    for mov in MovimientoInventario.objects.filter(
        producto__in=productos, fecha_movimiento__gt=hasta, rechazado=False,
    ).only('producto_id', 'stock_anterior', 'stock_resultante'):
        posteriores[mov.producto_id] = posteriores.get(mov.producto_id, 0) + (mov.stock_resultante - mov.stock_anterior)

    consumos = dict(
        MovimientoInventario.objects.filter(
            producto__in=productos, tipo=MovimientoInventario.Tipo.SALIDA, rechazado=False,
            fecha_movimiento__gte=desde, fecha_movimiento__lte=hasta,
        ).values_list('producto_id').annotate(total=models.Sum('cantidad')).values_list('producto_id', 'total')
    )

    filas = []
    for p in productos:
        existencia = p.stock_actual - posteriores.get(p.id, 0)
        comprar = p.stock_minimo - existencia
        if comprar > 0:
            filas.append({
                'codigo': p.codigo, 'descripcion': p.descripcion, 'existencia': existencia,
                'stock': p.stock_minimo, 'comprar': comprar, 'consumo': consumos.get(p.id, 0),
            })
    return filas


def generar_pdf_lista_compras(desde, hasta):
    filas = calcular_lista_compras(desde, hasta)
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
    )
    periodo = (
        desde.strftime('%d/%m/%Y') if desde == hasta
        else f'{desde.strftime("%d/%m/%Y")} al {hasta.strftime("%d/%m/%Y")}'
    )
    story = [
        Paragraph('Reserva Santa Margarita', _TITULO),
        Paragraph(f'Lista de compras — Alacena — {periodo}', _STYLES['Heading3']),
        Paragraph(f'Existencias al cierre del {hasta.strftime("%d/%m/%Y")}.', _VACIO),
        Spacer(1, 0.3 * cm),
    ]
    if not filas:
        story.append(Paragraph('Todo está en stock, no hay nada por comprar.', _VACIO))
    else:
        data = [[Paragraph(f'<font color="white"><b>{t}</b></font>', _CELDA) for t in ('Código', 'Descripción', 'Existencia', 'Stock', 'Consumo', 'Comprar')]]
        data += [
            [
                _p(f['codigo']), _p(f['descripcion']), _p(_fmt(f['existencia'])), _p(_fmt(f['stock'])),
                _p(_fmt(f['consumo'])), Paragraph(f'<b>{_fmt(f["comprar"])}</b>', _CELDA),
            ]
            for f in filas
        ]
        tabla = Table(data, colWidths=[2.3 * cm, 7 * cm, 2.2 * cm, 2 * cm, 2.2 * cm, 2.2 * cm], repeatRows=1)
        estilo = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f3347')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#999999')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (5, 1), (5, -1), colors.HexColor('#ffff66')),
        ])
        for i, f in enumerate(filas, start=1):
            if f['existencia'] <= 0:
                estilo.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#ff4d4d'))
        tabla.setStyle(estilo)
        story.append(tabla)
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(f'{len(filas)} producto(s) por comprar. Comprar = Stock − Existencia.', _VACIO))
    doc.build(story)
    return buffer.getvalue()
