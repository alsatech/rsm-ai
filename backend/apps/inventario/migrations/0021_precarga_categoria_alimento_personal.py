from django.db import migrations

# Nueva categoría pedida por Alfredo: comida para el personal de la reserva (Alacena), distinta
# de 'Alimentos y Costalera' que es alimento para ganado.
CATEGORIA = {'nombre': 'Alimento de Personal', 'color': '#eab308', 'icono': '🍞'}


def cargar(apps, schema_editor):
    CategoriaInventario = apps.get_model('inventario', 'CategoriaInventario')
    CategoriaInventario.objects.get_or_create(nombre=CATEGORIA['nombre'], defaults=CATEGORIA)


def revertir(apps, schema_editor):
    CategoriaInventario = apps.get_model('inventario', 'CategoriaInventario')
    CategoriaInventario.objects.filter(nombre=CATEGORIA['nombre']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0020_alter_ubicacion_nombre'),
    ]

    operations = [
        migrations.RunPython(cargar, revertir),
    ]
