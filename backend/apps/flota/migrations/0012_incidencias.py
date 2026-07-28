# Hecho a mano: incidencias (daños preexistentes a la salida, nuevos a la llegada) +
# se elimina presion_llantas y llanta_cambiada del modelo (ya no se capturan — todo es foto).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0011_checklist_gasolina_y_km_opcionales'),
    ]

    operations = [
        # Nuevos campos de texto para incidencias.
        migrations.AddField(
            model_name='checklistvehiculo',
            name='incidencia_previa',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='checklistvehiculo',
            name='incidencia_nueva',
            field=models.TextField(blank=True),
        ),
        # presion_llantas y llanta_cambiada ya no se usan — el modelo los sigue aceptando en
        # la BD para no perder datos históricos, pero el frontend ya no los envía.
        # Se quitan del modelo. Los registros existentes tendrán valor vacío.
        migrations.RemoveField(
            model_name='checklistvehiculo',
            name='presion_llantas',
        ),
        migrations.RemoveField(
            model_name='checklistvehiculo',
            name='llanta_cambiada',
        ),
        # Nuevas opciones en FotoChecklist.Item.
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
                ('incidencia_previa', 'Incidencia previa (daño reportado al sacar el vehículo)'),
                ('incidencia_nueva', 'Incidencia nueva (daño reportado al regresar el vehículo)'),
                ('', 'General'),
            ], max_length=25),
        ),
    ]
