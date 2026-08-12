from datetime import timedelta

import requests
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from shapely.geometry import Point, Polygon

# Perímetro real de la reserva (polígono "SantaMargarita" del KMZ oficial),
# en (lng, lat) — el orden que espera shapely.
PERIMETRO_SANTA_MARGARITA = Polygon([
    (-101.4626777804628, 29.48396887686232),
    (-101.4746337132147, 29.49851104338988),
    (-101.4826998813472, 29.50825954123203),
    (-101.4890278516725, 29.51599950861191),
    (-101.5005416038197, 29.53005178866769),
    (-101.5021860337556, 29.53203618259219),
    (-101.539789543005, 29.57641022179302),
    (-101.631343021428, 29.5465972257584),
    (-101.6242225400073, 29.53809425317317),
    (-101.6174223706014, 29.53008678409057),
    (-101.6085823938044, 29.51954996313071),
    (-101.5545391462648, 29.45530862425536),
    (-101.4626777804628, 29.48396887686232),
])

# 🧪 Polígono de pruebas — El Paso, TX. Caja amplia (~10 km) centrada en el
# punto real desde donde arrancan casi todas las pruebas del dispositivo
# (31.821106658459094, -106.54663358816666). Se usa en vez de
# PERIMETRO_SANTA_MARGARITA cuando SPOT_MODO_PRUEBAS=true.
_EL_PASO_LAT = 31.821106658459094
_EL_PASO_LNG = -106.54663358816666
_EL_PASO_DELTA_LAT = 0.05
_EL_PASO_DELTA_LNG = 0.06
PERIMETRO_EL_PASO_TX = Polygon([
    (_EL_PASO_LNG - _EL_PASO_DELTA_LNG, _EL_PASO_LAT - _EL_PASO_DELTA_LAT),
    (_EL_PASO_LNG + _EL_PASO_DELTA_LNG, _EL_PASO_LAT - _EL_PASO_DELTA_LAT),
    (_EL_PASO_LNG + _EL_PASO_DELTA_LNG, _EL_PASO_LAT + _EL_PASO_DELTA_LAT),
    (_EL_PASO_LNG - _EL_PASO_DELTA_LNG, _EL_PASO_LAT + _EL_PASO_DELTA_LAT),
    (_EL_PASO_LNG - _EL_PASO_DELTA_LNG, _EL_PASO_LAT - _EL_PASO_DELTA_LAT),
])

HORAS_SIN_SENAL = 2


def _parsear_fecha_spot(valor):
    """La API SPOT devuelve el dateTime como string ISO8601 (con o sin offset)."""
    if not valor:
        return timezone.now()
    dt = parse_datetime(str(valor))
    if dt is None:
        return timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    return dt


def _parsear_altitud(valor):
    if valor in (None, ''):
        return None
    try:
        return round(float(valor))
    except (TypeError, ValueError):
        return None


@shared_task
def consultar_spot():
    """Consulta la API SPOT cada 5 minutos y guarda posiciones nuevas."""
    from .models import AlertaSpot, AsignacionSpot, PosicionSpot

    feed_id = settings.SPOT_FEED_ID
    url = f'{settings.SPOT_API_BASE}/{feed_id}/message.json'

    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        feed_response = data.get('response', {}).get('feedMessageResponse')
        if not feed_response:
            return 'No messages'

        messages = feed_response.get('messages', {}).get('message', [])
        if isinstance(messages, dict):
            messages = [messages]

        asignacion = AsignacionSpot.objects.filter(activa=True).first()
        if not asignacion:
            return 'No active assignment'

        modo_pruebas = getattr(settings, 'SPOT_MODO_PRUEBAS', False)
        perimetro = PERIMETRO_EL_PASO_TX if modo_pruebas else PERIMETRO_SANTA_MARGARITA

        procesados = 0
        for msg in messages:
            spot_id = msg.get('id')
            if spot_id is None:
                continue
            spot_id = int(spot_id)
            if PosicionSpot.objects.filter(spot_message_id=spot_id).exists():
                continue

            lat = float(msg.get('latitude', 0))
            lng = float(msg.get('longitude', 0))
            punto = Point(lng, lat)
            dentro = perimetro.contains(punto)
            bateria = msg.get('batteryState', 'GOOD')

            posicion = PosicionSpot.objects.create(
                asignacion=asignacion,
                spot_message_id=spot_id,
                lat=lat,
                lng=lng,
                altitud=_parsear_altitud(msg.get('altitude')),
                fecha_hora_spot=_parsear_fecha_spot(msg.get('dateTime')),
                message_type=msg.get('messageType', 'TRACK'),
                bateria=bateria,
                dentro_perimetro=dentro,
            )
            procesados += 1

            if not dentro and not modo_pruebas:
                AlertaSpot.objects.create(
                    asignacion=asignacion,
                    tipo=AlertaSpot.Tipo.FUERA_PERIMETRO,
                    mensaje=f'⚠️ Dispositivo RSM2026 fuera del perímetro — lat:{lat}, lng:{lng}',
                    posicion=posicion,
                )
                print(f'ALERTA: Dispositivo fuera del perímetro en {lat},{lng}')

            if bateria == 'LOW':
                AlertaSpot.objects.create(
                    asignacion=asignacion,
                    tipo=AlertaSpot.Tipo.BATERIA_BAJA,
                    mensaje='⚠️ Batería baja en dispositivo SPOT RSM2026',
                    posicion=posicion,
                )
            elif bateria == 'CRITICAL':
                AlertaSpot.objects.create(
                    asignacion=asignacion,
                    tipo=AlertaSpot.Tipo.BATERIA_CRITICA,
                    mensaje='🔴 Batería CRÍTICA en dispositivo SPOT RSM2026',
                    posicion=posicion,
                )

        return f'Procesados {procesados} mensajes'

    except Exception as e:
        print(f'Error consultando SPOT API: {e}')
        return f'Error: {e}'


@shared_task
def verificar_sin_senal():
    """Verifica cada hora si han pasado más de 2 horas sin señal del dispositivo activo."""
    from .models import AlertaSpot, AsignacionSpot

    asignacion = AsignacionSpot.objects.filter(activa=True).first()
    if not asignacion:
        return 'No active assignment'

    ultima = asignacion.posiciones.order_by('-fecha_hora_spot').first()
    if not ultima:
        return 'No positions yet'

    ahora = timezone.now()
    diferencia = ahora - ultima.fecha_hora_spot

    if diferencia > timedelta(hours=HORAS_SIN_SENAL):
        existe = AlertaSpot.objects.filter(
            asignacion=asignacion, tipo=AlertaSpot.Tipo.SIN_SENAL, resuelta=False,
        ).exists()
        if not existe:
            AlertaSpot.objects.create(
                asignacion=asignacion,
                tipo=AlertaSpot.Tipo.SIN_SENAL,
                mensaje=f'🔴 Sin señal SPOT por más de {HORAS_SIN_SENAL} horas. Última señal: {ultima.fecha_hora_spot}',
            )
            print(f'ALERTA: Sin señal SPOT desde {ultima.fecha_hora_spot}')

    return f'Última señal hace {diferencia}'
