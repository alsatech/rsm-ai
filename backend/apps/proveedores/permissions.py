from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_CRUD_PROVEEDORES = (User.Rol.OPERACIONES, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


def _rol_en(request, roles):
    return bool(request.user and request.user.is_authenticated and request.user.rol in roles)


class PuedeCrudProveedores(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_CRUD_PROVEEDORES)
