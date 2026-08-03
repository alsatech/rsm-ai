# Hecho a mano: campo `proyecto` en ChecklistVehiculo. Obligatorio en salidas, libre
# (validación solo en serializer) — cuando exista Módulo 12 (Proyectos / Erik) se
# reemplaza por FK a Proyecto.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0014_fotochecklist_item_tablero'),
    ]

    operations = [
        migrations.AddField(
            model_name='checklistvehiculo',
            name='proyecto',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]