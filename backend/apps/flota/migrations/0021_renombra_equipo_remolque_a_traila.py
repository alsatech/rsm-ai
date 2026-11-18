import re

from django.db import migrations

# Los 4 vehículos tipo 'traila' (modelo 4x5) quedaron con equipo "Remolque N" desde la carga
# inicial, aunque su nombre y tipo son "Traila N". El selector del checklist de moto muestra
# el equipo, así que aparecían como remolques. 'Remolque Hechizos' (tipo remolque) no se toca.
PATRON = re.compile(r'^Remolque (\d+)$')


def renombrar(apps, schema_editor):
    Vehiculo = apps.get_model('flota', 'Vehiculo')
    for v in Vehiculo.objects.filter(tipo='traila'):
        m = PATRON.match(v.equipo or '')
        if m:
            v.equipo = f'Traila {m.group(1)}'
            v.save(update_fields=['equipo'])


def revertir(apps, schema_editor):
    Vehiculo = apps.get_model('flota', 'Vehiculo')
    for v in Vehiculo.objects.filter(tipo='traila'):
        m = re.match(r'^Traila (\d+)$', v.equipo or '')
        if m:
            v.equipo = f'Remolque {m.group(1)}'
            v.save(update_fields=['equipo'])


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0020_cambioaceite'),
    ]

    operations = [
        migrations.RunPython(renombrar, revertir),
    ]
