from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_CATALOGO = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_SALIDA = (User.Rol.CAMPO, User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_ENTRADA = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_VALIDAN = (User.Rol.INVENTARIO, User.Rol.SUPERADMIN)
ROLES_REPORTES_COMPLETOS = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_VEN_ALERTAS = (User.Rol.OPERACIONES, User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


def _rol_en(request, roles):
    return bool(request.user and request.user.is_authenticated and request.user.rol in roles)


class PuedeGestionarCatalogo(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_CATALOGO)


class PuedeRegistrarMovimiento(BasePermission):
    """La validación fina de entrada/salida se hace en el serializer (depende del campo 'tipo')."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_REGISTRAN_SALIDA)


class PuedeValidarMovimiento(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_VALIDAN)


class PuedeVerReportesCompletos(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_REPORTES_COMPLETOS)


class PuedeVerAlertas(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_VEN_ALERTAS)
