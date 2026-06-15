from celery import shared_task
from django.utils import timezone

from apps.users.models import User


@shared_task
def alerta_falla_hidraulica(registro_id):
    """Notifica a Alberto y Abigail cuando un registro hidráulico entra en estado de falla.

    Por ahora solo imprime en consola — WhatsApp/email quedan fuera del SLA actual.
    """
    from .models import RegistroHidraulico

    try:
        registro = RegistroHidraulico.objects.select_related('created_by').get(id=registro_id)
    except RegistroHidraulico.DoesNotExist:
        return

    destinatarios = User.objects.filter(rol__in=(User.Rol.SUPERADMIN, User.Rol.ADMINISTRADOR))
    nombres = ', '.join(usuario.get_full_name() or usuario.username for usuario in destinatarios)

    print(
        f'[ALERTA HIDRÁULICA] Falla en {registro.get_punto_medicion_display()} '
        f'reportada por {registro.created_by.get_full_name() or registro.created_by.username} '
        f'el {registro.fecha_hora:%Y-%m-%d %H:%M} — notificar a: {nombres}'
    )


@shared_task
def revisar_alertas_generadores():
    """Revisa diariamente si algún generador alcanzó el intervalo de horas de mantenimiento.

    Si horas_operacion >= horas_intervalo de una alerta activa y no se avisó hoy,
    imprime en consola el servicio requerido — WhatsApp queda fuera del SLA actual.
    """
    from .models import AlertaMantenimientoGenerador

    hoy = timezone.now().date()
    alertas = AlertaMantenimientoGenerador.objects.filter(
        activa=True, horas_intervalo__isnull=False
    ).select_related('generador')

    for alerta in alertas:
        generador = alerta.generador

        if generador.horas_operacion < alerta.horas_intervalo:
            continue
        if alerta.ultima_alerta and alerta.ultima_alerta.date() == hoy:
            continue

        print(
            f'[ALERTA MANTENIMIENTO GENERADOR] {generador.get_nombre_display()} '
            f'({generador.marca_modelo}) — {generador.horas_operacion}h registradas '
            f'(intervalo: {alerta.horas_intervalo}h). Servicio requerido: {alerta.tipo_servicio}'
        )

        alerta.ultima_alerta = timezone.now()
        alerta.save(update_fields=['ultima_alerta'])
