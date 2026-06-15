from celery import shared_task

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
