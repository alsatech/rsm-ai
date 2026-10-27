from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_VEN_TODOS = (User.Rol.OPERACIONES, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_GESTIONAN_PROYECTO = (User.Rol.OPERACIONES, User.Rol.SUPERADMIN)
ROLES_REGISTRAN_AVANCE = (User.Rol.CAMPO, User.Rol.OPERACIONES, User.Rol.SUPERADMIN)
ROLES_AUTORIZAN = (User.Rol.OPERACIONES, User.Rol.SUPERADMIN)


def _rol_en(request, roles):
    return bool(request.user and request.user.is_authenticated and request.user.rol in roles)


class PuedeCrearProyecto(BasePermission):
    """Crear/editar el proyecto (nombre, presupuesto, fechas, asignación) — Alberto/Minerva o Erik."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_AUTORIZAN)


class PuedeAutorizar(BasePermission):
    """Autorizar/rechazar proyecto o compra > $50,000 — superadmin o Erik (operaciones)."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_AUTORIZAN)


class PuedeGestionarProyecto(BasePermission):
    """Cotizaciones, compras, inventario del proyecto — Erik (operaciones) o superadmin."""

    def has_permission(self, request, view):
        return _rol_en(request, ROLES_GESTIONAN_PROYECTO)


class PuedeRegistrarAvance(BasePermission):
    def has_permission(self, request, view):
        return _rol_en(request, ROLES_REGISTRAN_AVANCE)
