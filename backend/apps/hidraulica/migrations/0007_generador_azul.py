from django.db import migrations


def crear_generador_azul(apps, schema_editor):
    Generador = apps.get_model('hidraulica', 'Generador')
    Generador.objects.get_or_create(nombre='azul', defaults={'marca_modelo': ''})


def eliminar_generador_azul(apps, schema_editor):
    Generador = apps.get_model('hidraulica', 'Generador')
    Generador.objects.filter(nombre='azul').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('hidraulica', '0006_alter_generador_nombre'),
    ]

    operations = [
        migrations.RunPython(crear_generador_azul, eliminar_generador_azul),
    ]
