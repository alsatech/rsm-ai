from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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


def _tabla(encabezados, filas, col_widths):
    data = [encabezados] + filas
    tabla = Table(data, colWidths=col_widths, repeatRows=1)
    tabla.setStyle(_ENCABEZADO_ESTILO)
    return tabla


def _seccion_hidraulica(story, registros):
    story.append(Paragraph('Hidráulica y pluviómetros', _SECCION))
    if not registros:
        story.append(Paragraph('Sin lecturas capturadas este día.', _VACIO))
        return
    filas = [
        [
            _p(r['punto_medicion']), _p(r['estado_display']), _p(r['nivel_pulgadas']),
            _p(r['caudal_m3h']), _p(r['presion_psi']), _p(r['lluvia_mm']), _p(r['reportado_por']),
        ]
        for r in registros
    ]
    story.append(_tabla(
        [_p('Punto'), _p('Estado'), _p('Nivel (pulg)'), _p('Caudal (m³/h)'), _p('Presión (psi)'), _p('Lluvia (mm)'), _p('Reportó')],
        filas, [3.3 * cm, 1.8 * cm, 2 * cm, 2.2 * cm, 2.2 * cm, 1.8 * cm, 3.2 * cm],
    ))
    fallas = [r for r in registros if r['estado'] != 'normal']
    if fallas:
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(
            'Alertas: ' + '; '.join(f"{r['punto_medicion']} ({r['estado_display']})" for r in fallas), _VACIO,
        ))


def _seccion_pendientes(story, datos):
    story.append(Paragraph('Pendientes', _SECCION))

    abiertos = datos['abiertos_y_bloqueados']
    story.append(Paragraph('Abiertos / bloqueados', _STYLES['Heading4']))
    if abiertos:
        filas = [
            [_p(p['titulo']), _p(p['estado_display']), _p(p['prioridad']), _p(p['motivo_bloqueo']), _p(', '.join(p['asignados']))]
            for p in abiertos
        ]
        story.append(_tabla(
            [_p('Título'), _p('Estado'), _p('Prioridad'), _p('Motivo bloqueo'), _p('Asignado a')],
            filas, [5 * cm, 2.3 * cm, 2 * cm, 3 * cm, 4.2 * cm],
        ))
    else:
        story.append(Paragraph('Sin pendientes abiertos ni bloqueados.', _VACIO))

    cerrados = datos['cerrados_hoy']
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph('Cerrados hoy', _STYLES['Heading4']))
    if cerrados:
        filas = [[_p(p['titulo']), _p(p['solucion_cierre'])] for p in cerrados]
        story.append(_tabla([_p('Título'), _p('Solución')], filas, [5 * cm, 11.5 * cm]))
    else:
        story.append(Paragraph('Sin pendientes cerrados hoy.', _VACIO))


def _seccion_flota(story, datos):
    story.append(Paragraph('Flota vehicular', _SECCION))
    checklists = datos['checklists']
    if not checklists:
        story.append(Paragraph('Sin checklists registrados este día.', _VACIO))
        return
    filas = [
        [_p(c['vehiculo']), _p(c['tipo_reporte']), _p(c['responsable']), _p(c['hora'].strftime('%H:%M'))]
        for c in checklists
    ]
    story.append(_tabla(
        [_p('Vehículo'), _p('Tipo'), _p('Responsable'), _p('Hora')],
        filas, [4.5 * cm, 2.3 * cm, 4.5 * cm, 2 * cm],
    ))
    incidencias = datos['con_incidencias']
    if incidencias:
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph('Incidencias y advertencias', _STYLES['Heading4']))
        for c in incidencias:
            texto = c['incidencia_previa'] or c['incidencia_nueva'] or '; '.join(c['advertencias'])
            story.append(Paragraph(f"{c['vehiculo']} ({c['responsable']}): {texto}", _CELDA))


def _seccion_ganado(story, datos):
    story.append(Paragraph('Ganado y recorridos', _SECCION))
    recorridos = datos['recorridos']
    if recorridos:
        filas = [
            [_p(r['responsable']), _p(r['numero_cabezas']), _p(r['estado_hato']), _p(r['narrativa'])]
            for r in recorridos
        ]
        story.append(_tabla(
            [_p('Responsable'), _p('Cabezas'), _p('Estado hato'), _p('Narrativa')],
            filas, [3.5 * cm, 1.8 * cm, 2.5 * cm, 5.5 * cm],
        ))
    else:
        story.append(Paragraph('Sin recorridos registrados este día.', _VACIO))

    alertas = datos['alertas']
    if alertas:
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph('Alertas SPOT', _STYLES['Heading4']))
        for a in alertas:
            estado = 'resuelta' if a['resuelta'] else 'activa'
            story.append(Paragraph(f"{a['tipo']} ({estado}): {a['mensaje']}", _CELDA))


def generar_pdf_minuta(fecha, datos, notas=''):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
    )
    story = [
        Paragraph('Reserva Santa Margarita', _TITULO),
        Paragraph(f'Minuta diaria — {fecha.strftime("%d/%m/%Y")}', _STYLES['Heading3']),
        Spacer(1, 0.3 * cm),
    ]

    _seccion_hidraulica(story, datos['hidraulica'])
    _seccion_pendientes(story, datos['pendientes'])
    _seccion_flota(story, datos['flota'])
    _seccion_ganado(story, datos['ganado'])

    story.append(Paragraph('Notas de la junta', _SECCION))
    story.append(Paragraph(notas, _CELDA) if notas else Paragraph('Sin notas adicionales.', _VACIO))

    doc.build(story)
    return buffer.getvalue()
