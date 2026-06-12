from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Usuario del sistema RSM con rol para control de accesos."""

    class Rol(models.TextChoices):
        CAMPO = 'campo', 'Campo'
        INVENTARIO = 'inventario', 'Inventario'
        OPERACIONES = 'operaciones', 'Operaciones'
        ADMINISTRADOR = 'administrador', 'Administrador'
        SUPERADMIN = 'superadmin', 'Superadmin'

    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.CAMPO)

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_rol_display()})'
