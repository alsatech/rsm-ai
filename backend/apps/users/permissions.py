from rest_framework.permissions import BasePermission

from .models import User


class EsCampo(BasePermission):
    """Permite acceso solo a usuarios con rol 'campo'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.rol == User.Rol.CAMPO)


class EsInventario(BasePermission):
    """Permite acceso solo a usuarios con rol 'inventario'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.rol == User.Rol.INVENTARIO)


class EsOperaciones(BasePermission):
    """Permite acceso solo a usuarios con rol 'operaciones'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.rol == User.Rol.OPERACIONES)


class EsAdministrador(BasePermission):
    """Permite acceso solo a usuarios con rol 'administrador'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.rol == User.Rol.ADMINISTRADOR)


class EsSuperadmin(BasePermission):
    """Permite acceso solo a usuarios con rol 'superadmin'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.rol == User.Rol.SUPERADMIN)


class EsAdministradorOSuperadmin(BasePermission):
    """Permite acceso a roles 'administrador' y 'superadmin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
        )
