from datetime import timedelta

from celery import shared_task
from django.utils import timezone

KM_INTERVALO_ACEITE = 5000
DIAS_INTERVALO_CALIBRACION = 90
DIAS_AVISO_VENCIMIENTO = 30


@shared_task
def revisar_alertas_flota():
    """Revisa diariamente (6 AM) vencimientos, cambios de aceite y calibración de llantas.

    Por ahora solo imprime en consola — WhatsApp queda fuera del SLA actual.
    """
    hoy = timezone.now().date()

    _revisar_alertas_por_km_y_fecha(hoy)
    _revisar_cambio_aceite(hoy)
    _revisar_calibracion_llantas(hoy)


def _revisar_alertas_por_km_y_fecha(hoy):
    from .models import AlertaFlota

    limite_fecha = hoy + timedelta(days=DIAS_AVISO_VENCIMIENTO)
    alertas = AlertaFlota.objects.filter(activa=True, resuelta=False).select_related('vehiculo')

    for alerta in alertas:
        if alerta.km_alerta is not None and alerta.vehiculo.kilometraje_actual >= alerta.km_alerta:
            print(
                f'[ALERTA FLOTA] {alerta.vehiculo.nombre} — {alerta.get_tipo_display()}: '
                f'{alerta.vehiculo.kilometraje_actual}km alcanzados (límite {alerta.km_alerta}km).'
            )
        elif alerta.fecha_alerta is not None and alerta.fecha_alerta <= limite_fecha:
            print(
                f'[ALERTA FLOTA] {alerta.vehiculo.nombre} — {alerta.get_tipo_display()}: '
                f'vence el {alerta.fecha_alerta:%Y-%m-%d}.'
            )


def _revisar_cambio_aceite(hoy):
    from .models import AlertaFlota, Vehiculo

    for vehiculo in Vehiculo.objects.filter(estado=Vehiculo.Estado.ACTIVO):
        ultimo_cambio = AlertaFlota.objects.filter(
            vehiculo=vehiculo, tipo=AlertaFlota.Tipo.CAMBIO_ACEITE, resuelta=True,
        ).order_by('-resuelta_en').first()
        km_base = ultimo_cambio.km_alerta if (ultimo_cambio and ultimo_cambio.km_alerta) else 0

        if float(vehiculo.kilometraje_actual) - km_base < KM_INTERVALO_ACEITE:
            continue

        existe_activa = AlertaFlota.objects.filter(
            vehiculo=vehiculo, tipo=AlertaFlota.Tipo.CAMBIO_ACEITE, activa=True, resuelta=False,
        ).exists()
        if existe_activa:
            continue

        siguiente_km = km_base + KM_INTERVALO_ACEITE
        AlertaFlota.objects.create(
            vehiculo=vehiculo,
            tipo=AlertaFlota.Tipo.CAMBIO_ACEITE,
            descripcion=f'{vehiculo.nombre} lleva {int(float(vehiculo.kilometraje_actual) - km_base)}km desde el último cambio de aceite.',
            km_alerta=siguiente_km,
        )
        print(f'[ALERTA FLOTA] {vehiculo.nombre} — cambio de aceite requerido ({vehiculo.kilometraje_actual}km).')


def _revisar_calibracion_llantas(hoy):
    from .models import AlertaFlota, ChecklistVehiculo, Vehiculo

    for vehiculo in Vehiculo.objects.filter(estado=Vehiculo.Estado.ACTIVO):
        ultimo_checklist = ChecklistVehiculo.objects.filter(vehiculo=vehiculo).order_by('-fecha_hora').first()
        if not ultimo_checklist:
            continue

        dias_transcurridos = (hoy - ultimo_checklist.fecha_hora.date()).days
        if dias_transcurridos < DIAS_INTERVALO_CALIBRACION:
            continue

        existe_activa = AlertaFlota.objects.filter(
            vehiculo=vehiculo, tipo=AlertaFlota.Tipo.CALIBRACION_LLANTAS, activa=True, resuelta=False,
        ).exists()
        if existe_activa:
            continue

        AlertaFlota.objects.create(
            vehiculo=vehiculo,
            tipo=AlertaFlota.Tipo.CALIBRACION_LLANTAS,
            descripcion=f'{vehiculo.nombre} no registra checklist hace {dias_transcurridos} días — revisar calibración de llantas.',
            fecha_alerta=hoy,
        )
        print(f'[ALERTA FLOTA] {vehiculo.nombre} — calibración de llantas pendiente ({dias_transcurridos} días).')
