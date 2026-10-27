from django.db import migrations

# 'Talabartería y Equipo de Montar' se había creado manualmente (fuera de migraciones) en
# desarrollo y nunca llegó a producción — esta migración la agrega formalmente para que
# quede igual en todos los entornos.
CATEGORIA = {'nombre': 'Talabartería y Equipo de Montar', 'color': '#ec4899', 'icono': '🐴'}


def cargar(apps, schema_editor):
    CategoriaInventario = apps.get_model('inventario', 'CategoriaInventario')
    CategoriaInventario.objects.get_or_create(nombre=CATEGORIA['nombre'], defaults=CATEGORIA)


def revertir(apps, schema_editor):
    CategoriaInventario = apps.get_model('inventario', 'CategoriaInventario')
    CategoriaInventario.objects.filter(nombre=CATEGORIA['nombre']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0016_compra_proveedor_ref'),
    ]

    operations = [
        migrations.RunPython(cargar, revertir),
    ]
