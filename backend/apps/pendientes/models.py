from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

User = get_user_model()


class Pendiente(models.Model):
    class Estado(models.TextChoices):
        ABIERTO = 'abierto', 'Abierto'
        EN_PROCESO = 'en_proceso', 'En proceso'
        BLOQUEADO = 'bloqueado', 'Bloqueado'
        CERRADO = 'cerrado', 'Terminado'

    class Prioridad(models.TextChoices):
        BAJA = 'baja', 'Baja'
        MEDIA = 'media', 'Media'
        ALTA = 'alta', 'Alta'
        URGENTE = 'urgente', 'Urgente'

    class MotivoBloqueo(models.TextChoices):
        FALTA_MATERIAL = 'falta_material', 'Falta de material'
        FALTA_PERSONAL = 'falta_personal', 'Falta de personal'
        FALTA_PRESUPUESTO = 'falta_presupuesto', 'Falta de presupuesto'
        INCIDENTE = 'incidente', 'Incidente'
        CLIMA = 'clima', 'Clima'
        OTRO = 'otro', 'Otro'

    class Origen(models.TextChoices):
        JUNTA = 'junta', 'Junta'
        CAMPO = 'campo', 'Campo'
        ADMINISTRACION = 'administracion', 'Administración'
        SISTEMA = 'sistema', 'Sistema'

    class ModuloRelacionado(models.TextChoices):
        HIDRAULICA = 'hidraulica', 'Hidráulica'
        FLOTA = 'flota', 'Flota'
        INVENTARIO = 'inventario', 'Inventario'
        PROYECTOS = 'proyectos', 'Proyectos'
        PERSONAL = 'personal', 'Personal'
        NINGUNO = 'ninguno', 'Ninguno'

    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ABIERTO)
    prioridad = models.CharField(max_length=10, choices=Prioridad.choices, default=Prioridad.MEDIA)
    motivo_bloqueo = models.CharField(
        max_length=20, choices=MotivoBloqueo.choices, null=True, blank=True
    )
    origen = models.CharField(max_length=20, choices=Origen.choices, default=Origen.JUNTA)
    modulo_relacionado = models.CharField(
        max_length=20, choices=ModuloRelacionado.choices, default=ModuloRelacionado.NINGUNO
    )
    registro_relacionado_id = models.IntegerField(null=True, blank=True)
    asignado_a = models.ManyToManyField(User, blank=True, related_name='pendientes_asignados')
    fecha_asignacion = models.DateField(null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    solucion_cierre = models.TextField(blank=True, default='')
    se_compro_material = models.BooleanField(null=True, blank=True)
    quien_compro = models.CharField(max_length=200, blank=True)
    cerrado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cierres_pendientes',
    )
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='pendientes_creados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Pendiente'
        verbose_name_plural = 'Pendientes'

    def __str__(self):
        return f'{self.titulo} [{self.get_estado_display()}]'

    def dias_abierto(self):
        if self.estado == self.Estado.CERRADO and self.fecha_cierre:
            delta = self.fecha_cierre - self.created_at
        else:
            delta = timezone.now() - self.created_at
        return delta.days


class HistorialPendiente(models.Model):
    pendiente = models.ForeignKey(Pendiente, on_delete=models.CASCADE, related_name='historial')
    usuario = models.ForeignKey(User, on_delete=models.PROTECT)
    cambio = models.CharField(max_length=300)
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    nota = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha']
        verbose_name = 'Historial de pendiente'
        verbose_name_plural = 'Historial de pendientes'

    def __str__(self):
        return f'{self.pendiente.titulo}: {self.cambio}'


class FotoPendiente(models.Model):
    class Momento(models.TextChoices):
        APERTURA = 'apertura', 'Apertura'
        SEGUIMIENTO = 'seguimiento', 'Seguimiento'
        CIERRE = 'cierre', 'Cierre'

    pendiente = models.ForeignKey(Pendiente, on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='pendientes/%Y/%m/')
    momento = models.CharField(max_length=15, choices=Momento.choices, default=Momento.SEGUIMIENTO)
    descripcion = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Foto de pendiente'
        verbose_name_plural = 'Fotos de pendientes'

    def __str__(self):
        return f'Foto {self.get_momento_display()} — {self.pendiente.titulo}'
