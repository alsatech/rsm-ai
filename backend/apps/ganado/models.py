from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Corraleta(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7)
    lng = models.DecimalField(max_digits=10, decimal_places=7)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Corraleta'
        verbose_name_plural = 'Corraletas'

    def __str__(self):
        return self.nombre


class RecorridoGanado(models.Model):
    class EstadoHato(models.TextChoices):
        BIEN = 'bien', 'Bien'
        ALERTA = 'alerta', 'Alerta'
        CRITICO = 'critico', 'Crítico'

    class Color(models.TextChoices):
        AZUL_CLARO = 'azul_claro', 'Azul claro'
        ROJO = 'rojo', 'Rojo'
        VERDE = 'verde', 'Verde'
        NARANJA = 'naranja', 'Naranja'
        MORADO = 'morado', 'Morado'
        AMARILLO = 'amarillo', 'Amarillo'

    fecha = models.DateField()
    responsable = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='recorridos_responsable'
    )
    asistentes = models.ManyToManyField(
        User, related_name='recorridos_asistidos', blank=True
    )
    numero_cabezas = models.IntegerField(null=True, blank=True)
    estado_hato = models.CharField(max_length=10, choices=EstadoHato.choices)
    color = models.CharField(max_length=20, choices=Color.choices, default=Color.AZUL_CLARO)
    corraletas_visitadas = models.ManyToManyField(
        Corraleta, through='ParadaRecorrido', blank=True
    )
    narrativa = models.TextField()
    observaciones = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='recorridos_creados'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha', '-created_at']
        verbose_name = 'Recorrido de ganado'
        verbose_name_plural = 'Recorridos de ganado'

    def __str__(self):
        nombre = self.responsable.get_full_name() or self.responsable.username
        return f'Recorrido {self.fecha} — {nombre}'


class ParadaRecorrido(models.Model):
    recorrido = models.ForeignKey(
        RecorridoGanado, on_delete=models.CASCADE, related_name='paradas'
    )
    corraleta = models.ForeignKey(Corraleta, on_delete=models.PROTECT)
    orden = models.IntegerField()
    hora_llegada = models.TimeField(null=True, blank=True)

    class Meta:
        ordering = ['orden']
        unique_together = [('recorrido', 'orden')]
        verbose_name = 'Parada de recorrido'
        verbose_name_plural = 'Paradas de recorrido'

    def __str__(self):
        return f'{self.recorrido} — Parada {self.orden}: {self.corraleta.nombre}'


class FotoRecorrido(models.Model):
    recorrido = models.ForeignKey(
        RecorridoGanado, on_delete=models.CASCADE, related_name='fotos'
    )
    foto = models.ImageField(upload_to='ganado/%Y/%m/')
    descripcion = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Foto de recorrido'
        verbose_name_plural = 'Fotos de recorrido'

    def __str__(self):
        return f'Foto — {self.recorrido}'
