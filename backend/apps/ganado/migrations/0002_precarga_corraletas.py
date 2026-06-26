from django.db import migrations

CORRALETAS = [
    {'nombre': 'CORRALES', 'lat': '29.5459019', 'lng': '-101.5411132'},
    {'nombre': 'MARGARITAS/TOROS-EL REY', 'lat': '29.5084097', 'lng': '-101.4831925'},
    {'nombre': "7'S SAN FERNANDO", 'lat': '29.4807563', 'lng': '-101.5749373'},
    {'nombre': '1B-2A/3B-4A CHAPOTE', 'lat': '29.5386976', 'lng': '-101.5663881'},
    {'nombre': "1'S-3'S CORRALES NVOS", 'lat': '29.5320000', 'lng': '-101.5898629'},
    {'nombre': '1A-3A LOS ANGELES', 'lat': '29.5255083', 'lng': '-101.6133899'},
    {'nombre': 'BUFALO', 'lat': '29.5225508', 'lng': '-101.5663237'},
    {'nombre': '3A-5A LOS ANGELES', 'lat': '29.4976438', 'lng': '-101.5899339'},
    {'nombre': "3'S-5'S", 'lat': '29.5054886', 'lng': '-101.5683330'},
    {'nombre': 'CUADRUPLES NORTE', 'lat': '29.5138830', 'lng': '-101.5453740'},
    {'nombre': '2B-4B EL REY', 'lat': '29.5528200', 'lng': '-101.5205294'},
    {'nombre': 'PILA DEL LUNES', 'lat': '29.5297836', 'lng': '-101.5009111'},
    {'nombre': 'CUADRUPLES SUR', 'lat': '29.4939404', 'lng': '-101.5306243'},
    {'nombre': "5'S-7'S", 'lat': '29.4873508', 'lng': '-101.5535320'},
    {'nombre': "7'S LA ESPERANZA", 'lat': '29.4623069', 'lng': '-101.5324399'},
    {'nombre': '7B TRAMPAS', 'lat': '29.4841000', 'lng': '-101.5209025'},
    {'nombre': '7B TRAMPA RANCHO LA ESPERANZA', 'lat': '29.4695928', 'lng': '-101.5094500'},
    {'nombre': 'TRAMPAS EL REY', 'lat': '29.4983484', 'lng': '-101.4746693'},
    {'nombre': "4'S MARGARITAS", 'lat': '29.5216779', 'lng': '-101.5234504'},
    {'nombre': '1A NORTE', 'lat': '29.5413534', 'lng': '-101.6161092'},
    {'nombre': '2A NORTE', 'lat': '29.5561829', 'lng': '-101.5642193'},
    {'nombre': '2B NORTE', 'lat': '29.5656413', 'lng': '-101.5426186'},
    {'nombre': '7A SUR', 'lat': '29.4651136', 'lng': '-101.5485271'},
    {'nombre': 'TRAMPA RANCHO SUR', 'lat': '29.4877496', 'lng': '-101.4778128'},
    {'nombre': 'MARGARITAS TRAMPA TOROS 1/2', 'lat': '29.5011517', 'lng': '-101.5099729'},
    {'nombre': 'EL NOPAL', 'lat': '29.5031253', 'lng': '-101.5480136'},
    {'nombre': '1B NORTE', 'lat': '29.5469025', 'lng': '-101.5883376'},
]


def cargar_corraletas(apps, schema_editor):
    Corraleta = apps.get_model('ganado', 'Corraleta')
    for datos in CORRALETAS:
        Corraleta.objects.get_or_create(nombre=datos['nombre'], defaults=datos)


def revertir_corraletas(apps, schema_editor):
    Corraleta = apps.get_model('ganado', 'Corraleta')
    nombres = [c['nombre'] for c in CORRALETAS]
    Corraleta.objects.filter(nombre__in=nombres).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('ganado', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(cargar_corraletas, revertir_corraletas),
    ]
