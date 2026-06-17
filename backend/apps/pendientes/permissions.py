from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_ADMIN = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_CON_ACCESO = (User.Rol.CAMPO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


class PuedeCrearPendiente(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_ADMIN
        )


class PuedeVerPendiente(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeEditarPendiente(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_ADMIN
        )


class PuedeCambiarEstado(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeVerHistorial(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_ADMIN
        )


class PuedeSubirFoto(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeEliminarFoto(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_ADMIN
        )


class PuedeEliminarPendiente(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol == User.Rol.SUPERADMIN
        )
