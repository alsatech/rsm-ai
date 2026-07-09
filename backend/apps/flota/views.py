from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AlertaFlota, ChecklistVehiculo, FotoChecklist, Vehiculo
from .permissions import (
    PuedeCrearChecklist,
    PuedeEliminarVehiculo,
    PuedeGestionarVehiculo,
    PuedeValidarChecklist,
    PuedeVerAlertas,
)
from .serializers import (
    AlertaFlotaSerializer,
    ChecklistVehiculoSerializer,
    FotoChecklistSerializer,
    ResolverAlertaSerializer,
    ValidarChecklistSerializer,
    VehiculoSerializer,
)


class VehiculoListCreateView(generics.ListCreateAPIView):
    serializer_class = VehiculoSerializer
    queryset = Vehiculo.objects.all()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeGestionarVehiculo()]
        return [IsAuthenticated()]


class VehiculoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), PuedeEliminarVehiculo()]
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeGestionarVehiculo()]
        return [IsAuthenticated()]


class VehiculoHistorialView(APIView):
    """GET /vehiculos/{id}/historial/ — checklists del vehículo, más recientes primero."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        vehiculo = get_object_or_404(Vehiculo, pk=pk)
        checklists = vehiculo.checklists.select_related('responsable', 'validado_por').prefetch_related('fotos')
        serializer = ChecklistVehiculoSerializer(checklists, many=True)
        return Response(serializer.data)


class ChecklistListCreateView(generics.ListCreateAPIView):
    serializer_class = ChecklistVehiculoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearChecklist()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = ChecklistVehiculo.objects.select_related(
            'vehiculo', 'responsable', 'validado_por'
        ).prefetch_related('fotos')
        p = self.request.query_params

        vehiculo = p.get('vehiculo')
        tipo_reporte = p.get('tipo_reporte')
        responsable = p.get('responsable')
        fecha = p.get('fecha')
        validado = p.get('validado')

        if vehiculo:
            qs = qs.filter(vehiculo_id=vehiculo)
        if tipo_reporte:
            qs = qs.filter(tipo_reporte=tipo_reporte)
        if responsable:
            qs = qs.filter(responsable_id=responsable)
        if fecha:
            qs = qs.filter(fecha_hora__date=fecha)
        if validado is not None:
            qs = qs.filter(validado=validado.lower() == 'true')

        return qs

    def perform_create(self, serializer):
        extra = {}
        if 'responsable' not in serializer.validated_data:
            extra['responsable'] = self.request.user
        serializer.save(**extra)


class ChecklistDetailView(generics.RetrieveUpdateAPIView):
    queryset = ChecklistVehiculo.objects.select_related(
        'vehiculo', 'responsable', 'validado_por'
    ).prefetch_related('fotos')
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return ValidarChecklistSerializer
        return ChecklistVehiculoSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeValidarChecklist()]
        return [IsAuthenticated()]


class FotoChecklistListView(APIView):
    permission_classes = [IsAuthenticated, PuedeCrearChecklist]

    def post(self, request, pk):
        checklist = get_object_or_404(ChecklistVehiculo, pk=pk)

        serializer = FotoChecklistSerializer(
            data=request.data,
            context={'checklist': checklist, 'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(checklist=checklist, uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FotoChecklistDeleteView(APIView):
    permission_classes = [IsAuthenticated, PuedeValidarChecklist]

    def delete(self, request, pk, foto_id):
        foto = get_object_or_404(FotoChecklist, pk=foto_id, checklist_id=pk)
        foto.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlertaFlotaListView(generics.ListAPIView):
    serializer_class = AlertaFlotaSerializer
    permission_classes = [IsAuthenticated, PuedeVerAlertas]

    def get_queryset(self):
        qs = AlertaFlota.objects.select_related('vehiculo', 'resuelta_por')
        p = self.request.query_params

        vehiculo = p.get('vehiculo')
        tipo = p.get('tipo')
        activa = p.get('activa')
        resuelta = p.get('resuelta')

        if vehiculo:
            qs = qs.filter(vehiculo_id=vehiculo)
        if tipo:
            qs = qs.filter(tipo=tipo)
        if activa is not None:
            qs = qs.filter(activa=activa.lower() == 'true')
        if resuelta is not None:
            qs = qs.filter(resuelta=resuelta.lower() == 'true')

        return qs


class ResolverAlertaView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerAlertas]

    def patch(self, request, pk):
        alerta = get_object_or_404(AlertaFlota, pk=pk)
        serializer = ResolverAlertaSerializer(alerta, data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(AlertaFlotaSerializer(alerta).data)


class ResumenFlotaView(APIView):
    """GET /resumen/ — para dashboard: vehículos activos, alertas activas, último checklist por vehículo."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vehiculos_activos = Vehiculo.objects.filter(estado=Vehiculo.Estado.ACTIVO).count()
        alertas_activas = AlertaFlota.objects.filter(activa=True, resuelta=False).count()
        alertas_criticas = sum(
            1 for a in AlertaFlota.objects.filter(activa=True, resuelta=False).select_related('vehiculo')
            if AlertaFlotaSerializer(a).data['urgencia'] == 'critico'
        )

        hace_48h = timezone.now() - timezone.timedelta(hours=48)
        vehiculos_sin_checklist = Vehiculo.objects.filter(estado=Vehiculo.Estado.ACTIVO).exclude(
            checklists__fecha_hora__gte=hace_48h
        ).count()

        return Response({
            'vehiculos_activos': vehiculos_activos,
            'alertas_activas': alertas_activas,
            'alertas_criticas': alertas_criticas,
            'vehiculos_sin_checklist_48h': vehiculos_sin_checklist,
        })
