from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.users.models import User

from .models import ChecklistGenerador, Generador, RegistroHidraulico
from .permissions import (
    PuedeActualizarHorasGenerador,
    PuedeCrearChecklistGenerador,
    PuedeCrearRegistroHidraulico,
    PuedeValidarRegistroHidraulico,
    PuedeVerGenerador,
    PuedeVerHistorialChecklistGenerador,
    PuedeVerRegistroHidraulico,
)
from .serializers import (
    ChecklistGeneradorSerializer,
    GeneradorSerializer,
    RegistroHidraulicoSerializer,
    ValidarRegistroHidraulicoSerializer,
)


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


class GeneradorListView(generics.ListAPIView):
    """GET: lista de los 3 generadores con horas actuales y alertas pendientes."""

    queryset = Generador.objects.prefetch_related('alertas_mantenimiento')
    serializer_class = GeneradorSerializer
    permission_classes = [IsAuthenticated, PuedeVerGenerador]


class GeneradorDetailView(generics.RetrieveUpdateAPIView):
    """GET: detalle de un generador. PATCH: actualizar horas_operacion (administrador/superadmin)."""

    queryset = Generador.objects.prefetch_related('alertas_mantenimiento')
    serializer_class = GeneradorSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeActualizarHorasGenerador()]
        return [IsAuthenticated(), PuedeVerGenerador()]

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ChecklistGeneradorListCreateView(generics.ListCreateAPIView):
    """GET: historial de revisiones de un generador. POST: registrar revisión diaria."""

    serializer_class = ChecklistGeneradorSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearChecklistGenerador()]
        return [IsAuthenticated(), PuedeVerHistorialChecklistGenerador()]

    def get_queryset(self):
        queryset = ChecklistGenerador.objects.select_related('created_by', 'generador').filter(
            generador_id=self.kwargs['pk']
        )

        if self.request.user.rol == User.Rol.CAMPO:
            queryset = queryset.filter(created_by=self.request.user)

        return queryset

    def perform_create(self, serializer):
        generador = get_object_or_404(Generador, pk=self.kwargs['pk'])
        serializer.save(generador=generador, created_by=self.request.user)
