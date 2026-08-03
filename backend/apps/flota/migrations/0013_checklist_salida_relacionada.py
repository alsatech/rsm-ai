# Hecho a mano: vincular cada LLEGADA con su SALIDA del mismo vehículo y mismo día.
# Quita el placeholder "proyecto" del frontend — el backend nunca lo persistió.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0012_incidencias'),
    ]

    operations = [
        migrations.AddField(
            model_name='checklistvehiculo',
            name='salida_relacionada',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'tipo_reporte': 'salida'},
                null=True,
                on_delete=models.SET_NULL,
                related_name='llegadas',
                to='flota.checklistvehiculo',
            ),
        ),
        # Cada salida solo puede ser cerrada por una llegada.
        migrations.AddConstraint(
            model_name='checklistvehiculo',
            constraint=models.UniqueConstraint(
                fields=('salida_relacionada',),
                condition=models.Q(salida_relacionada__isnull=False),
                name='uniq_llegada_por_salida',
            ),
        ),
    ]