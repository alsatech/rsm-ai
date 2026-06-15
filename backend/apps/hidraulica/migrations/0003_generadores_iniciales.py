from django.db import migrations

GENERADORES = [
    {
        'nombre': 'chapote',
        'marca_modelo': 'Wacker Neuson G25 20kW',
        'alertas': [
            {
                'tipo_servicio': (
                    'Cambio de aceite y filtro, filtros de combustible, '
                    'tensión de correa, limpieza de radiador'
                ),
                'horas_intervalo': 250,
                'meses_intervalo': None,
            },
            {
                'tipo_servicio': 'Filtros de aire, batería, conexiones eléctricas',
                'horas_intervalo': 500,
                'meses_intervalo': None,
            },
            {
                'tipo_servicio': 'Refrigerante, holgura de válvulas, limpieza de DPF/DOC',
                'horas_intervalo': 1000,
                'meses_intervalo': None,
            },
        ],
    },
    {
        'nombre': 'rancho',
        'marca_modelo': 'Cummins 225 20kW',
        'alertas': [
            {
                'tipo_servicio': 'Inspección visual, aceite, refrigerante, batería, filtro de aire',
                'horas_intervalo': 100,
                'meses_intervalo': 3,
            },
            {
                'tipo_servicio': 'Servicio completo: aceite, filtros, bujías, prueba bajo carga',
                'horas_intervalo': 250,
                'meses_intervalo': 12,
            },
            {
                'tipo_servicio': 'Refrigerante, tapón de presión, termostato, holgura de válvulas',
                'horas_intervalo': 400,
                'meses_intervalo': 24,
            },
        ],
    },
    {
        'nombre': 'margaritas',
        'marca_modelo': 'Detroit Diesel 3-71 20kW',
        'alertas': [
            {
                'tipo_servicio': 'Cambio de aceite y filtros (o anual si está en reserva)',
                'horas_intervalo': 100,
                'meses_intervalo': 12,
            },
            {
                'tipo_servicio': 'Filtros de combustible, filtro de aire, tensión de correa, batería',
                'horas_intervalo': 250,
                'meses_intervalo': None,
            },
            {
                'tipo_servicio': 'Refrigerante',
                'horas_intervalo': 1000,
                'meses_intervalo': 12,
            },
            {
                'tipo_servicio': 'Holgura de válvulas, sincronización de inyectores',
                'horas_intervalo': 1000,
                'meses_intervalo': None,
            },
            {
                'tipo_servicio': 'Inspección de compresor Roots, puertos de barrido, culata',
                'horas_intervalo': 3000,
                'meses_intervalo': None,
            },
        ],
    },
]


def crear_generadores(apps, schema_editor):
    Generador = apps.get_model('hidraulica', 'Generador')
    AlertaMantenimientoGenerador = apps.get_model('hidraulica', 'AlertaMantenimientoGenerador')

    for datos in GENERADORES:
        generador = Generador.objects.create(nombre=datos['nombre'], marca_modelo=datos['marca_modelo'])
        for alerta in datos['alertas']:
            AlertaMantenimientoGenerador.objects.create(generador=generador, **alerta)


def eliminar_generadores(apps, schema_editor):
    Generador = apps.get_model('hidraulica', 'Generador')
    Generador.objects.filter(nombre__in=[datos['nombre'] for datos in GENERADORES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('hidraulica', '0002_generador_checklistgenerador_and_more'),
    ]

    operations = [
        migrations.RunPython(crear_generadores, eliminar_generadores),
    ]
