# Hecho a mano: gasolina y kilometraje ahora son opcionales (se registran por foto).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0010_checklist_traila_simplificado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='checklistvehiculo',
            name='km_reporte',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name='checklistvehiculo',
            name='nivel_combustible',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='fotochecklist',
            name='item',
            field=models.CharField(blank=True, choices=[
                ('kilometraje', 'Kilometraje / horómetro'),
                ('gasolina', 'Gasolina (foto del tablero)'),
                ('estado_fisico_derecho', 'Estado físico — costado derecho'),
                ('estado_fisico_izquierdo', 'Estado físico — costado izquierdo'),
                ('estado_fisico_frente', 'Estado físico — frente'),
                ('estado_fisico_trasero', 'Estado físico — trasero'),
                ('estado_fisico_interior', 'Estado físico — interior'),
                ('lavado', 'Lavado'),
                ('soplado_filtro_aire', 'Sopleteo de filtro de aire'),
                ('presion_llantas', 'Presión de llantas'),
                ('anticongelante', 'Anticongelante'),
                ('nivel_aceite_motor', 'Nivel de aceite motor'),
                ('nivel_aceite_transmision', 'Nivel de aceite transmisión'),
                ('carga_traila', 'Carga de la traila'),
                ('limpieza', 'Limpieza'),
                ('sin_herramientas', 'Sin herramientas'),
                ('sin_carga', 'Sin carga'),
                ('', 'General'),
            ], max_length=25),
        ),
    ]
