import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ganado', '0002_precarga_corraletas'),
    ]

    operations = [
        # RecorridoGanado: allow blank estado_hato (set during finalizar, not iniciar)
        migrations.AlterField(
            model_name='recorridoganado',
            name='estado_hato',
            field=models.CharField(
                blank=True,
                choices=[('bien', 'Bien'), ('alerta', 'Alerta'), ('critico', 'Crítico')],
                max_length=10,
            ),
        ),
        # RecorridoGanado: allow blank narrativa (set during finalizar)
        migrations.AlterField(
            model_name='recorridoganado',
            name='narrativa',
            field=models.TextField(blank=True),
        ),
        # RecorridoGanado: add estado (existing rows = finalizado, new default = en_curso)
        migrations.AddField(
            model_name='recorridoganado',
            name='estado',
            field=models.CharField(
                choices=[('en_curso', 'En curso'), ('finalizado', 'Finalizado')],
                default='finalizado',
                max_length=15,
            ),
            preserve_default=False,
        ),
        # RecorridoGanado: add hora_inicio
        migrations.AddField(
            model_name='recorridoganado',
            name='hora_inicio',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        # RecorridoGanado: add hora_fin
        migrations.AddField(
            model_name='recorridoganado',
            name='hora_fin',
            field=models.DateTimeField(blank=True, null=True),
        ),
        # ParadaRecorrido: make corraleta optional (support nombre_libre)
        migrations.AlterField(
            model_name='paradarecorrido',
            name='corraleta',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='ganado.corraleta',
            ),
        ),
        # ParadaRecorrido: add nombre_libre for off-catalog stops
        migrations.AddField(
            model_name='paradarecorrido',
            name='nombre_libre',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        # ParadaRecorrido: add lat/lng for nombre_libre stops with coords
        migrations.AddField(
            model_name='paradarecorrido',
            name='lat',
            field=models.DecimalField(
                blank=True, decimal_places=7, max_digits=10, null=True
            ),
        ),
        migrations.AddField(
            model_name='paradarecorrido',
            name='lng',
            field=models.DecimalField(
                blank=True, decimal_places=7, max_digits=10, null=True
            ),
        ),
    ]
