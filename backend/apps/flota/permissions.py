from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_ADMIN = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_GESTION_VEHICULO = (User.Rol.OPERACIONES, User.Rol.SUPERADMIN)
ROLES_CREAN_CHECKLIST = (User.Rol.CAMPO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


def _rol_en(request, roles):
    return bool(request.user and request.user.is_authenticated and request.user.rol in roles)


class PuedeGestionarVehiculo(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_GESTION_VEHICULO)


class PuedeEliminarVehiculo(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, (User.Rol.SUPERADMIN,))


class PuedeCrearChecklist(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_CREAN_CHECKLIST)


class PuedeValidarChecklist(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_ADMIN)


class PuedeVerAlertas(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_ADMIN)
