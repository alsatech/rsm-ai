from rest_framework.permissions import BasePermission

from apps.users.models import User

ROLES_MINUTA = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


class PuedeVerMinuta(BasePermission):
    """Ver, generar y regenerar la minuta diaria — rol administrador o superadmin.
    Alberto (superadmin) la genera en la junta; Minerva (superadmin) y Abigail/Alexia
    (administrador) tienen el mismo acceso, sin distinción entre generar y solo ver."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.rol in ROLES_MINUTA)
