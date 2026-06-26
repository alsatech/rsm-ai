from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_ADMIN = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_CON_ACCESO = (User.Rol.CAMPO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


class PuedeCrearRecorrido(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeVerRecorridos(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeEliminarRecorrido(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_ADMIN
        )


class PuedeGestionarCorraletas(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_ADMIN
        )
