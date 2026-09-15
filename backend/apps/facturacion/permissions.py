from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_FACTURACION = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_RESUMEN = (User.Rol.OPERACIONES, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_SUPERADMIN = (User.Rol.SUPERADMIN,)


def _rol_en(request, roles):
    return bool(request.user and request.user.is_authenticated and request.user.rol in roles)


class PuedeVerFacturacion(BasePermission):
    """Ver/crear/editar/borrar facturas y ver relaciones — Minerva (superadmin) y Alexia (administrador)."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_FACTURACION)


class PuedeVerResumen(BasePermission):
    """Widget de resumen — además de Minerva/Alexia, Erik (operaciones) lo ve en el dashboard."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_RESUMEN)


class EsSuperadmin(BasePermission):
    """Generar la relación mensual e importar facturas de otros módulos — solo Minerva."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_SUPERADMIN)
