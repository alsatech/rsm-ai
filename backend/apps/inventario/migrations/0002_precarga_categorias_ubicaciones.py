from django.db import migrations

CATEGORIAS = [
    {'nombre': 'Conexiones Hidráulicas', 'color': '#0ea5e9', 'icono': '💧'},
    {'nombre': 'Alimentos y Costalera', 'color': '#4ade80', 'icono': '🌾'},
    {'nombre': 'Construcción y Materiales', 'color': '#f59e0b', 'icono': '🏗️'},
    {'nombre': 'Combustibles', 'color': '#f87171', 'icono': '⛽'},
    {'nombre': 'Herramientas', 'color': '#8b5cf6', 'icono': '🔧'},
    {'nombre': 'Refacciones y Llantas', 'color': '#fb923c', 'icono': '🔩'},
    {'nombre': 'Veterinaria y Sanidad', 'color': '#34d399', 'icono': '💊'},
    {'nombre': 'Otros', 'color': '#6b7280', 'icono': '📦'},
]

UBICACIONES = ['bodega', 'granero', 'hangar']


def cargar(apps, schema_editor):
    CategoriaInventario = apps.get_model('inventario', 'CategoriaInventario')
    Ubicacion = apps.get_model('inventario', 'Ubicacion')

    for datos in CATEGORIAS:
        CategoriaInventario.objects.get_or_create(nombre=datos['nombre'], defaults=datos)

    for nombre in UBICACIONES:
        Ubicacion.objects.get_or_create(nombre=nombre)


def revertir(apps, schema_editor):
    CategoriaInventario = apps.get_model('inventario', 'CategoriaInventario')
    Ubicacion = apps.get_model('inventario', 'Ubicacion')
    CategoriaInventario.objects.filter(nombre__in=[c['nombre'] for c in CATEGORIAS]).delete()
    Ubicacion.objects.filter(nombre__in=UBICACIONES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('inventario', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(cargar, revertir),
    ]
