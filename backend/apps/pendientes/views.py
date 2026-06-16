from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User

from .models import FotoPendiente, HistorialPendiente, Pendiente
from .permissions import (
    PuedeCambiarEstado,
    PuedeCrearPendiente,
    PuedeEditarPendiente,
    PuedeEliminarFoto,
    PuedeSubirFoto,
    PuedeVerHistorial,
    PuedeVerPendiente,
)
from .serializers import (
    CambiarEstadoSerializer,
    FotoPendienteSerializer,
    HistorialPendienteSerializer,
    PendienteSerializer,
)

ROLES_ADMIN = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


def _qs_pendiente_base(user):
    qs = Pendiente.objects.select_related('created_by', 'cerrado_por').prefetch_related(
        'asignado_a', 'fotos'
    )
    if user.rol == User.Rol.CAMPO:
        qs = qs.filter(asignado_a=user)
    return qs


class PendienteListCreateView(generics.ListCreateAPIView):
    serializer_class = PendienteSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearPendiente()]
        return [IsAuthenticated(), PuedeVerPendiente()]

    def get_queryset(self):
        qs = _qs_pendiente_base(self.request.user)
        p = self.request.query_params

        estado = p.get('estado')
        prioridad = p.get('prioridad')
        asignado_a = p.get('asignado_a')
        origen = p.get('origen')
        modulo = p.get('modulo_relacionado')
        fecha_limite = p.get('fecha_limite')

        if estado:
            qs = qs.filter(estado=estado)
        if prioridad:
            qs = qs.filter(prioridad=prioridad)
        if asignado_a:
            qs = qs.filter(asignado_a__id=asignado_a)
        if origen:
            qs = qs.filter(origen=origen)
        if modulo:
            qs = qs.filter(modulo_relacionado=modulo)
        if fecha_limite:
            qs = qs.filter(fecha_limite=fecha_limite)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PendienteDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PendienteSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeEditarPendiente()]
        return [IsAuthenticated(), PuedeVerPendiente()]

    def get_queryset(self):
        return _qs_pendiente_base(self.request.user)


class HistorialPendienteView(generics.ListAPIView):
    serializer_class = HistorialPendienteSerializer
    permission_classes = [IsAuthenticated, PuedeVerHistorial]

    def get_queryset(self):
        return HistorialPendiente.objects.select_related('usuario').filter(
            pendiente_id=self.kwargs['pk']
        )


class CambiarEstadoPendienteView(APIView):
    permission_classes = [IsAuthenticated, PuedeCambiarEstado]

    def _get_pendiente(self, pk, user):
        qs = Pendiente.objects.prefetch_related('asignado_a')
        if user.rol == User.Rol.CAMPO:
            qs = qs.filter(asignado_a=user)
        try:
            return qs.get(pk=pk)
        except Pendiente.DoesNotExist:
            raise NotFound('Pendiente no encontrado.')

    def post(self, request, pk):
        pendiente = self._get_pendiente(pk, request.user)
        serializer = CambiarEstadoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        nuevo_estado = serializer.validated_data['estado']
        motivo_bloqueo = serializer.validated_data.get('motivo_bloqueo') or ''
        nota = serializer.validated_data.get('nota', '')
        user = request.user

        if user.rol == User.Rol.CAMPO and nuevo_estado not in (
            Pendiente.Estado.EN_PROCESO,
            Pendiente.Estado.BLOQUEADO,
        ):
            return Response(
                {'detail': 'El personal de campo solo puede cambiar el estado a "en proceso" o "bloqueado".'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if nuevo_estado == Pendiente.Estado.BLOQUEADO and not motivo_bloqueo:
            return Response(
                {'motivo_bloqueo': 'Debes indicar el motivo del bloqueo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if nuevo_estado == pendiente.estado:
            return Response(
                {'detail': 'El pendiente ya tiene ese estado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pendiente._usuario_cambio = user
        pendiente._nota_cambio = nota
        pendiente.estado = nuevo_estado
        pendiente.motivo_bloqueo = motivo_bloqueo if nuevo_estado == Pendiente.Estado.BLOQUEADO else None

        if nuevo_estado == Pendiente.Estado.CERRADO:
            pendiente.cerrado_por = user
            if not pendiente.fecha_cierre:
                pendiente.fecha_cierre = timezone.now()

        pendiente.save()
        return Response(PendienteSerializer(pendiente).data)


class ResumenPendientesView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerPendiente]

    def get(self, request):
        qs = _qs_pendiente_base(request.user)
        conteo = qs.values('estado').annotate(total=Count('id'))
        resumen = {item['estado']: item['total'] for item in conteo}

        tres_dias_atras = timezone.now() - timezone.timedelta(days=3)
        sin_actualizacion = qs.filter(updated_at__lt=tres_dias_atras).exclude(
            estado=Pendiente.Estado.CERRADO
        ).count()

        return Response({
            'abierto': resumen.get('abierto', 0),
            'en_proceso': resumen.get('en_proceso', 0),
            'bloqueado': resumen.get('bloqueado', 0),
            'cerrado': resumen.get('cerrado', 0),
            'total': qs.count(),
            'sin_actualizacion_3_dias': sin_actualizacion,
        })


class FotoPendienteListView(APIView):
    permission_classes = [IsAuthenticated, PuedeSubirFoto]

    def post(self, request, pk):
        qs = Pendiente.objects.prefetch_related('fotos')
        if request.user.rol == User.Rol.CAMPO:
            qs = qs.filter(asignado_a=request.user)
        pendiente = get_object_or_404(qs, pk=pk)

        serializer = FotoPendienteSerializer(
            data=request.data,
            context={'pendiente': pendiente, 'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(pendiente=pendiente, uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FotoPendienteDeleteView(APIView):
    permission_classes = [IsAuthenticated, PuedeEliminarFoto]

    def delete(self, request, pk, foto_id):
        foto = get_object_or_404(FotoPendiente, pk=foto_id, pendiente_id=pk)
        foto.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
