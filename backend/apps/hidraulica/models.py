from django.conf import settings
from django.db import models
from django.utils import timezone


class RegistroHidraulico(models.Model):
    """Lectura diaria de un punto del sistema hidráulico o pluviométrico."""

    class PuntoMedicion(models.TextChoices):
        PILA_NORTE_1 = 'pila_norte_1', 'Pila Norte 1'
        PILA_NORTE_2 = 'pila_norte_2', 'Pila Norte 2'
        PILA_SUR_1 = 'pila_sur_1', 'Pila Sur 1'
        PILA_CENTRO = 'pila_centro', 'Pila Centro'
        FLUXOMETRO_LINEA_A = 'fluxometro_linea_a', 'Fluxómetro Línea A'
        FLUXOMETRO_LINEA_B = 'fluxometro_linea_b', 'Fluxómetro Línea B'
        MANOMETRO_TRAMPA_SUR = 'manometro_trampa_sur', 'Manómetro Trampa Sur'
        MANOMETRO_CASA_NORTE = 'manometro_casa_norte', 'Manómetro Casa Norte'
        PLUVIOMETRO_1 = 'pluviometro_1', 'Pluviómetro 1'
        PLUVIOMETRO_2 = 'pluviometro_2', 'Pluviómetro 2'

    class Estado(models.TextChoices):
        NORMAL = 'normal', 'Normal'
        ALERTA = 'alerta', 'Alerta'
        FALLA = 'falla', 'Falla'

    punto_medicion = models.CharField(max_length=30, choices=PuntoMedicion.choices)
    estado = models.CharField(max_length=10, choices=Estado.choices)

    nivel_pulgadas = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    caudal_m3h = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    presion_psi = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    lluvia_mm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    observaciones = models.TextField(blank=True)
    foto = models.ImageField(upload_to='hidraulica/%Y/%m/', null=True, blank=True)

    fecha_hora = models.DateTimeField(default=timezone.now)
    validado = models.BooleanField(default=False)
    validado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='registros_hidraulicos_validados',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='registros_hidraulicos',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = 'Registro hidráulico'
        verbose_name_plural = 'Registros hidráulicos'

    def __str__(self):
        return f'{self.get_punto_medicion_display()} — {self.get_estado_display()} ({self.fecha_hora:%Y-%m-%d %H:%M})'

    def save(self, *args, **kwargs):
        es_nuevo = self._state.adding
        super().save(*args, **kwargs)

        if es_nuevo and self.estado == self.Estado.FALLA:
            from .tasks import alerta_falla_hidraulica

            alerta_falla_hidraulica.delay(self.id)


class Generador(models.Model):
    """Generador eléctrico de la reserva — control de horas de operación."""

    class Nombre(models.TextChoices):
        CHAPOTE = 'chapote', 'Chapote'
        RANCHO = 'rancho', 'Rancho'
        MARGARITAS = 'margaritas', 'Margaritas'

    nombre = models.CharField(max_length=20, choices=Nombre.choices, unique=True)
    marca_modelo = models.CharField(max_length=100)
    horas_operacion = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='generadores_actualizados',
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Generador'
        verbose_name_plural = 'Generadores'

    def __str__(self):
        return f'{self.get_nombre_display()} ({self.marca_modelo})'


class ChecklistGenerador(models.Model):
    """Revisión diaria de un generador (aceite, refrigerante, filtro de aire, fugas)."""

    generador = models.ForeignKey(Generador, on_delete=models.CASCADE, related_name='checklists')
    fecha_hora = models.DateTimeField(default=timezone.now)

    nivel_aceite = models.BooleanField(default=False)
    nivel_refrigerante = models.BooleanField(default=False)
    filtro_aire = models.BooleanField(default=False)
    sin_fugas = models.BooleanField(default=False)
    observaciones = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checklists_generador',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = 'Checklist de generador'
        verbose_name_plural = 'Checklists de generadores'

    def __str__(self):
        return f'Checklist {self.generador.get_nombre_display()} — {self.fecha_hora:%Y-%m-%d %H:%M}'


class AlertaMantenimientoGenerador(models.Model):
    """Intervalo de mantenimiento preventivo (horas y/o meses) para un generador."""

    generador = models.ForeignKey(Generador, on_delete=models.CASCADE, related_name='alertas_mantenimiento')
    tipo_servicio = models.CharField(max_length=255)
    horas_intervalo = models.IntegerField(null=True, blank=True)
    meses_intervalo = models.IntegerField(null=True, blank=True)
    ultima_alerta = models.DateTimeField(null=True, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ['generador', 'horas_intervalo']
        verbose_name = 'Alerta de mantenimiento de generador'
        verbose_name_plural = 'Alertas de mantenimiento de generadores'

    def __str__(self):
        return f'{self.generador.get_nombre_display()} — {self.tipo_servicio}'
