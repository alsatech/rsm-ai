# Hecho a mano: nueva opción `tablero` en FotoChecklist.Item. Une kilometraje + gasolina
# en una sola foto. El frontend lo usa para llegadas — las fotos históricas con
# `kilometraje` o `gasolina` siguen siendo válidas y se conservan en BD.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0013_checklist_salida_relacionada'),
    ]

    operations = [
        migrations.AlterField(
            model_name='fotochecklist',
            name='item',
            field=models.CharField(blank=True, choices=[
                ('kilometraje', 'Kilometraje / horómetro'),
                ('gasolina', 'Gasolina (foto del tablero)'),
                ('tablero', 'Tablero (kilometraje + gasolina)'),
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
                ('incidencia_previa', 'Incidencia previa (daño reportado al sacar el vehículo)'),
                ('incidencia_nueva', 'Incidencia nueva (daño reportado al regresar el vehículo)'),
                ('', 'General'),
            ], max_length=25),
        ),
    ]