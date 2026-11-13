"""Agrega en vivo lo capturado en otros módulos para una fecha dada — no se duplica
nada en la base de datos de Minuta, solo se consulta al momento de generar/ver."""
import re
from datetime import datetime, time, timedelta

from django.utils import timezone


def _nombre(usuario):
    if not usuario:
        return None
    return usuario.get_full_name() or usuario.username


def datos_hidraulica(fecha):
    from apps.hidraulica.models import RegistroHidraulico

    registros = (
        RegistroHidraulico.objects.filter(fecha_hora__date=fecha)
        .select_related('created_by')
        .order_by('punto_medicion')
    )
    return [
        {
            'id': r.id,
            'punto_medicion': r.get_punto_medicion_display(),
            'estado': r.estado,
            'estado_display': r.get_estado_display(),
            'nivel_pulgadas': r.nivel_pulgadas,
            'caudal_m3h': r.caudal_m3h,
            'presion_psi': r.presion_psi,
            'lluvia_mm': r.lluvia_mm,
            'observaciones': r.observaciones,
            'reportado_por': _nombre(r.created_by),
            'hora': r.fecha_hora,
        }
        for r in registros
    ]


_ESTATUS_MINUTA = {'abierto': 'ABIERTO', 'en_proceso': 'EN PROCESO', 'bloqueado': 'EN PAUSA', 'cerrado': 'TERMINADO'}
_CODIGO_EN_TITULO = re.compile(r'^([A-Za-z]{0,3}\d+[A-Za-z]?) · (.+)$', re.S)


def _separar_descripcion(descripcion):
    """
import reLa importación de la minuta operativa guarda 'Responsable:' y 'Siguiente revisión:' como
    líneas al final de la descripción; el resto es el 'Acuerdo logrado'."""
    logrado, responsable, revision = [], '', ''
    for linea in (descripcion or '').splitlines():
        if linea.startswith('Responsable:'):
            responsable = linea[len('Responsable:'):].strip()
        elif linea.startswith('Siguiente revisión:'):
            revision = linea[len('Siguiente revisión:'):].strip()
        else:
            logrado.append(linea)
    return '\n'.join(logrado).strip(), responsable, revision


def _clave_orden_codigo(codigo):
    """Orden como en el documento: 003, 011... primero, luego P03.., luego E03..; sin Nº al final."""
    if not codigo:
        return (2, '', 0, '')
    match = re.match(r'^([A-Za-z]*)(\d+)([A-Za-z]*)$', codigo)
    prefijo, numero, sufijo = match.groups()
    return (0 if not prefijo else 1, prefijo.upper(), int(numero), sufijo.lower())


def _serializar_pendiente(p):
    match = _CODIGO_EN_TITULO.match(p.titulo)
    codigo, acuerdo = (match.group(1), match.group(2)) if match else ('', p.titulo)
    logrado, responsable, revision = _separar_descripcion(p.descripcion)
    asignados = [_nombre(u) for u in p.asignado_a.all()]
    return {
        'id': p.id,
        'titulo': p.titulo,
        'codigo': codigo,
        'acuerdo': acuerdo,
        'acuerdo_logrado': logrado,
        'responsable': responsable or ', '.join(asignados),
        'fecha_revision': revision,
        'estatus_minuta': _ESTATUS_MINUTA.get(p.estado, p.get_estado_display().upper()),
        'estado': p.estado,
        'estado_display': p.get_estado_display(),
        'prioridad': p.get_prioridad_display(),
        'motivo_bloqueo': p.get_motivo_bloqueo_display() if p.motivo_bloqueo else None,
        'asignados': asignados,
        'solucion_cierre': p.solucion_cierre,
    }


def datos_pendientes(fecha):
    from apps.pendientes.models import Pendiente

    abiertos_y_bloqueados = (
        Pendiente.objects.filter(estado__in=['abierto', 'en_proceso', 'bloqueado'])
        .prefetch_related('asignado_a')
        .order_by('-prioridad', '-created_at')
    )
    # Cada cierre aparece una sola vez: desde las 7:00 AM del día anterior (hora de la minuta
    # automática) hasta el final de la fecha. Un pendiente cerrado el viernes sale en la minuta
    # del sábado y ya no en la del domingo.
    inicio_ventana = timezone.make_aware(datetime.combine(fecha - timedelta(days=1), time(7, 0)))
    fin_ventana = timezone.make_aware(datetime.combine(fecha + timedelta(days=1), time(0, 0)))
    cerrados_hoy = (
        Pendiente.objects.filter(
            estado=Pendiente.Estado.CERRADO, fecha_cierre__gte=inicio_ventana, fecha_cierre__lt=fin_ventana,
        )
        .prefetch_related('asignado_a')
    )
    creados_hoy = Pendiente.objects.filter(created_at__date=fecha).prefetch_related('asignado_a')

    return {
        'abiertos_y_bloqueados': sorted(
            (_serializar_pendiente(p) for p in abiertos_y_bloqueados),
            key=lambda d: _clave_orden_codigo(d['codigo']),
        ),
        'cerrados_hoy': [_serializar_pendiente(p) for p in cerrados_hoy],
        'creados_hoy': [_serializar_pendiente(p) for p in creados_hoy],
    }


def datos_flota(fecha):
    from apps.flota.models import ChecklistVehiculo

    checklists = (
        ChecklistVehiculo.objects.filter(fecha_hora__date=fecha)
        .select_related('vehiculo', 'responsable')
        .prefetch_related('advertencias')
        .order_by('fecha_hora')
    )

    checklists_data = []
    for c in checklists:
        checklists_data.append({
            'id': c.id,
            'vehiculo': c.vehiculo.nombre,
            'tipo_reporte': c.get_tipo_reporte_display(),
            'responsable': _nombre(c.responsable),
            'hora': c.fecha_hora,
            'incidencia_previa': c.incidencia_previa,
            'incidencia_nueva': c.incidencia_nueva,
            'advertencias': [a.motivo for a in c.advertencias.all()],
        })

    con_incidencias = [
        c for c in checklists_data if c['incidencia_previa'] or c['incidencia_nueva'] or c['advertencias']
    ]

    return {'checklists': checklists_data, 'con_incidencias': con_incidencias}


def datos_ganado(fecha):
    from apps.ganado.models import AlertaSpot, RecorridoGanado

    recorridos = (
        RecorridoGanado.objects.filter(fecha=fecha, tipo=RecorridoGanado.Tipo.REAL)
        .select_related('responsable')
        .order_by('hora_inicio')
    )
    alertas = AlertaSpot.objects.filter(created_at__date=fecha).order_by('created_at')

    return {
        'recorridos': [
            {
                'id': r.id,
                'responsable': _nombre(r.responsable),
                'numero_cabezas': r.numero_cabezas,
                'estado_hato': r.get_estado_hato_display() if r.estado_hato else None,
                'narrativa': r.narrativa,
                'observaciones': r.observaciones,
            }
            for r in recorridos
        ],
        'alertas': [
            {
                'id': a.id,
                'tipo': a.get_tipo_display(),
                'mensaje': a.mensaje,
                'resuelta': a.resuelta,
            }
            for a in alertas
        ],
    }


def obtener_datos_dia(fecha):
    return {
        'hidraulica': datos_hidraulica(fecha),
        'pendientes': datos_pendientes(fecha),
        'flota': datos_flota(fecha),
        'ganado': datos_ganado(fecha),
    }
