from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_CATALOGO = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_SALIDA = (User.Rol.CAMPO, User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_ENTRADA = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_VALIDAN = (User.Rol.INVENTARIO, User.Rol.SUPERADMIN)
ROLES_REPORTES_COMPLETOS = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_VEN_ALERTAS = (User.Rol.OPERACIONES, User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)

ROLES_TODOS = (
    User.Rol.CAMPO, User.Rol.INVENTARIO, User.Rol.OPERACIONES, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN,
)
ROLES_AUTORIZAN_SOLICITUD = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_ENVIO = (User.Rol.OPERACIONES, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_RECEPCION = (User.Rol.CAMPO, User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_RESUELVEN_REPORTE = (User.Rol.INVENTARIO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_COMPRA = (
    User.Rol.INVENTARIO, User.Rol.OPERACIONES, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN,
)
ROLES_GESTIONAN_RELACION_COMPRAS = (User.Rol.INVENTARIO, User.Rol.SUPERADMIN)


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


class PuedeCrearSolicitud(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_TODOS)


class PuedeAutorizarSolicitud(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_AUTORIZAN_SOLICITUD)


class PuedeRegistrarEnvio(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_REGISTRAN_ENVIO)


class PuedeRegistrarRecepcion(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_REGISTRAN_RECEPCION)


class PuedeReportarFaltante(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_TODOS)


class PuedeResolverReporte(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_RESUELVEN_REPORTE)


class PuedeRegistrarCompra(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_REGISTRAN_COMPRA)


class PuedeGestionarRelacionCompras(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_GESTIONAN_RELACION_COMPRAS)


class PuedeEditarSolicitud(BasePermission):
    """El creador solo edita mientras está en borrador; administrador/superadmin editan siempre."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_TODOS)

    def has_object_permission(self, request, view, obj):
        if request.user.rol in ROLES_AUTORIZAN_SOLICITUD:
            return True
        return obj.created_by_id == request.user.id and obj.estado == obj.Estado.BORRADOR
