from django.db import migrations


def copiar_contratistas(apps, schema_editor):
    Contratista = apps.get_model('proyectos', 'Contratista')
    Proveedor = apps.get_model('proveedores', 'Proveedor')
    for c in Contratista.objects.all():
        Proveedor.objects.create(
            id=c.id,
            tipo='contratista',
            nombre=c.nombre,
            empresa=c.empresa,
            especialidad=c.especialidad,
            rfc=c.rfc,
            notas=c.notas,
            activo=c.activo,
            created_by_id=c.created_by_id,
        )


def revertir(apps, schema_editor):
    Proveedor = apps.get_model('proveedores', 'Proveedor')
    Proveedor.objects.filter(tipo='contratista').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('proveedores', '0001_initial'),
        ('proyectos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(copiar_contratistas, revertir),
    ]
