from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(pre_save, sender='pendientes.Pendiente')
def pendiente_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            anterior = sender.objects.get(pk=instance.pk)
            instance._estado_anterior = anterior.estado
        except sender.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None

    if instance.estado == 'bloqueado' and not instance.motivo_bloqueo:
        raise ValidationError({'motivo_bloqueo': ['Debes indicar el motivo del bloqueo.']})

    if instance.estado == 'cerrado' and not instance.fecha_cierre:
        instance.fecha_cierre = timezone.now()


@receiver(post_save, sender='pendientes.Pendiente')
def pendiente_post_save(sender, instance, created, **kwargs):
    estado_anterior = getattr(instance, '_estado_anterior', None)
    if not created and estado_anterior and estado_anterior != instance.estado:
        usuario = getattr(instance, '_usuario_cambio', None)
        nota = getattr(instance, '_nota_cambio', '')
        if usuario:
            from .models import HistorialPendiente
            HistorialPendiente.objects.create(
                pendiente=instance,
                usuario=usuario,
                cambio=f'Estado: {estado_anterior} → {instance.estado}',
                estado_anterior=estado_anterior,
                estado_nuevo=instance.estado,
                nota=nota or '',
            )
