# Hecho a mano: permitir NULL en `ChecklistVehiculo.proyecto` para que el frontend
# pueda omitir el campo en llegadas (la llegada hereda el proyecto por transitividad
# de la salida vinculada). La obligatoriedad en SALIDAS se valida en el serializer.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0015_checklist_proyecto'),
    ]

    operations = [
        migrations.AlterField(
            model_name='checklistvehiculo',
            name='proyecto',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]