"""Agrega en vivo lo capturado en otros módulos para una fecha dada — no se duplica
nada en la base de datos de Minuta, solo se consulta al momento de generar/ver."""


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


def _serializar_pendiente(p):
    return {
        'id': p.id,
        'titulo': p.titulo,
        'estado': p.estado,
        'estado_display': p.get_estado_display(),
        'prioridad': p.get_prioridad_display(),
        'motivo_bloqueo': p.get_motivo_bloqueo_display() if p.motivo_bloqueo else None,
        'asignados': [_nombre(u) for u in p.asignado_a.all()],
        'solucion_cierre': p.solucion_cierre,
    }


def datos_pendientes(fecha):
    from apps.pendientes.models import Pendiente

    abiertos_y_bloqueados = (
        Pendiente.objects.filter(estado__in=['abierto', 'en_proceso', 'bloqueado'])
        .prefetch_related('asignado_a')
        .order_by('-prioridad', '-created_at')
    )
    cerrados_hoy = (
        Pendiente.objects.filter(estado=Pendiente.Estado.CERRADO, fecha_cierre__date=fecha)
        .prefetch_related('asignado_a')
    )
    creados_hoy = Pendiente.objects.filter(created_at__date=fecha).prefetch_related('asignado_a')

    return {
        'abiertos_y_bloqueados': [_serializar_pendiente(p) for p in abiertos_y_bloqueados],
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
