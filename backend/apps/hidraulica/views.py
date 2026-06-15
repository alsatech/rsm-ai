from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.users.models import User

from .models import RegistroHidraulico
from .permissions import PuedeCrearRegistroHidraulico, PuedeValidarRegistroHidraulico, PuedeVerRegistroHidraulico
from .serializers import RegistroHidraulicoSerializer, ValidarRegistroHidraulicoSerializer


class RegistroHidraulicoListCreateView(generics.ListCreateAPIView):
    """GET: lista de registros (filtrada por rol y query params). POST: crear registro."""

    serializer_class = RegistroHidraulicoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearRegistroHidraulico()]
        return [IsAuthenticated(), PuedeVerRegistroHidraulico()]

    def get_queryset(self):
        queryset = RegistroHidraulico.objects.select_related('created_by', 'validado_por')
        user = self.request.user

        if user.rol == User.Rol.CAMPO:
            queryset = queryset.filter(created_by=user)

        params = self.request.query_params
        fecha = params.get('fecha')
        punto = params.get('punto_medicion')
        estado = params.get('estado')
        usuario_id = params.get('created_by')

        if fecha:
            queryset = queryset.filter(fecha_hora__date=fecha)
        if punto:
            queryset = queryset.filter(punto_medicion=punto)
        if estado:
            queryset = queryset.filter(estado=estado)
        if usuario_id:
            queryset = queryset.filter(created_by_id=usuario_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RegistroHidraulicoDetailView(generics.RetrieveUpdateAPIView):
    """GET: detalle de un registro. PATCH: validar registro (solo administrador/superadmin)."""

    queryset = RegistroHidraulico.objects.select_related('created_by', 'validado_por')
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return ValidarRegistroHidraulicoSerializer
        return RegistroHidraulicoSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeValidarRegistroHidraulico()]
        return [IsAuthenticated(), PuedeVerRegistroHidraulico()]

    def perform_update(self, serializer):
        serializer.save(validado_por=self.request.user)
