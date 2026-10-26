import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('proyectos', '0001_initial'),
        ('proveedores', '0002_copiar_contratistas'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cotizacionmanoobra',
            name='contratista',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='cotizaciones',
                to='proveedores.proveedor',
            ),
        ),
        migrations.AlterField(
            model_name='compraproyecto',
            name='contratista_proveedor',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='compras_proyecto',
                to='proveedores.proveedor',
            ),
        ),
        migrations.DeleteModel(name='Contratista'),
    ]
