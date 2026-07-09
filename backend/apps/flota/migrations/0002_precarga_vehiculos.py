from django.db import migrations

VEHICULOS = [
    {
        'nombre': 'Savana', 'tipo': 'camioneta', 'marca': 'GMC', 'modelo': 'Savana',
        'anio': 2009, 'color': 'Blanco', 'kilometraje_actual': 247347,
    },
    {
        'nombre': 'Blazer', 'tipo': 'camioneta', 'marca': 'Chevrolet', 'modelo': 'Blazer',
        'anio': 2000, 'color': 'Rojo', 'kilometraje_actual': 0,
    },
    {
        'nombre': 'Polaris', 'tipo': 'utv', 'marca': 'Polaris', 'modelo': '900',
        'anio': 2018, 'color': 'Verde', 'kilometraje_actual': 0,
    },
    {
        'nombre': 'Cuatrimoto Roja', 'tipo': 'cuatrimoto', 'marca': 'Honda', 'modelo': 'TRX',
        'anio': 2015, 'color': 'Rojo', 'kilometraje_actual': 0,
    },
    {
        'nombre': 'Moto Azul', 'tipo': 'moto', 'marca': 'Honda', 'modelo': 'CRF',
        'anio': 2016, 'color': 'Azul', 'kilometraje_actual': 0,
    },
    {
        'nombre': 'Camión', 'tipo': 'camion', 'marca': 'Ford', 'modelo': 'F-350',
        'anio': 2010, 'color': 'Blanco', 'kilometraje_actual': 0,
    },
]


def cargar_vehiculos(apps, schema_editor):
    Vehiculo = apps.get_model('flota', 'Vehiculo')
    for datos in VEHICULOS:
        Vehiculo.objects.get_or_create(nombre=datos['nombre'], defaults=datos)


def revertir_vehiculos(apps, schema_editor):
    Vehiculo = apps.get_model('flota', 'Vehiculo')
    nombres = [v['nombre'] for v in VEHICULOS]
    Vehiculo.objects.filter(nombre__in=nombres).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('flota', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(cargar_vehiculos, revertir_vehiculos),
    ]
