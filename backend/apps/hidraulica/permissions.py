from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_CON_ACCESO = (User.Rol.CAMPO, User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)
ROLES_VALIDADOR = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


class PuedeCrearRegistroHidraulico(BasePermission):
    """Permite crear registros a 'campo', 'administrador' y 'superadmin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeVerRegistroHidraulico(BasePermission):
    """Permite ver registros a 'campo' (los propios), 'administrador' y 'superadmin' (todos)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )

    def has_object_permission(self, request, view, obj):
        if request.user.rol == User.Rol.CAMPO:
            return obj.created_by_id == request.user.id
        return True


class PuedeValidarRegistroHidraulico(BasePermission):
    """Permite validar registros solo a 'administrador' y 'superadmin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_VALIDADOR
        )


class PuedeVerGenerador(BasePermission):
    """Permite ver generadores a 'campo', 'administrador' y 'superadmin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeActualizarHorasGenerador(BasePermission):
    """Permite actualizar horas_operacion solo a 'administrador' y 'superadmin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_VALIDADOR
        )


class PuedeCrearChecklistGenerador(BasePermission):
    """Permite crear checklists de generador a 'campo', 'administrador' y 'superadmin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )


class PuedeVerHistorialChecklistGenerador(BasePermission):
    """Permite ver el historial de checklists a 'campo' (los propios), 'administrador' y 'superadmin' (todos)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_CON_ACCESO
        )
