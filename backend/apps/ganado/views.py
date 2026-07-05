from django.db.models import Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User

from .models import Corraleta, FotoRecorrido, ParadaRecorrido, RecorridoGanado
from .permissions import (
    PuedeCrearRecorrido,
    PuedeEliminarRecorrido,
    PuedeGestionarCorraletas,
    PuedeGestionarPlan,
    PuedeVerClasificacion,
    PuedeVerHeatmap,
    PuedeVerRecorridos,
)
from .serializers import (
    AgregarParadaSerializer,
    CorraletaSerializer,
    CrearPlanSerializer,
    EditarPlanSerializer,
    FinalizarRecorridoSerializer,
    FotoRecorridoSerializer,
    IniciarRecorridoSerializer,
    ParadaRecorridoSerializer,
    PlanRecorridoSerializer,
    RecorridoGanadoCreateSerializer,
    RecorridoGanadoSerializer,
    SyncParadasSerializer,
)

ROLES_ADMIN = (User.Rol.ADMINISTRADOR, User.Rol.SUPERADMIN)


def _qs_recorrido_base(user):
    qs = RecorridoGanado.objects.filter(tipo=RecorridoGanado.Tipo.REAL).select_related(
        'responsable', 'created_by'
    ).prefetch_related('asistentes', 'paradas__corraleta', 'fotos')
    if user.rol == User.Rol.CAMPO:
        qs = qs.filter(Q(responsable=user) | Q(asistentes=user)).distinct()
    return qs


def _vincular_plan_si_existe(recorrido):
    """Si existe un plan (tipo=planeado) para la misma fecha, vincula el recorrido real a ese plan."""
    if recorrido.plan_referencia_id:
        return None
    plan = RecorridoGanado.objects.filter(
        fecha=recorrido.fecha, tipo=RecorridoGanado.Tipo.PLANEADO,
    ).first()
    if plan:
        recorrido.plan_referencia = plan
        recorrido.save(update_fields=['plan_referencia'])
    return plan


def _percentil(valores_ordenados, pct):
    """Percentil con interpolación lineal (método usado por numpy/Excel por defecto)."""
    if not valores_ordenados:
        return 0
    k = (len(valores_ordenados) - 1) * pct
    piso = int(k)
    techo = min(piso + 1, len(valores_ordenados) - 1)
    if piso == techo:
        return valores_ordenados[piso]
    return valores_ordenados[piso] * (techo - k) + valores_ordenados[techo] * (k - piso)


class CorraletaListCreateView(generics.ListCreateAPIView):
    serializer_class = CorraletaSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeGestionarCorraletas()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Corraleta.objects.filter(activa=True)


class CorraletaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Corraleta.objects.all()
    serializer_class = CorraletaSerializer
    permission_classes = [IsAuthenticated, PuedeGestionarCorraletas]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']


class RecorridoGanadoListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearRecorrido()]
        return [IsAuthenticated(), PuedeVerRecorridos()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RecorridoGanadoCreateSerializer
        return RecorridoGanadoSerializer

    def get_queryset(self):
        qs = _qs_recorrido_base(self.request.user)
        p = self.request.query_params

        fecha = p.get('fecha')
        fecha_desde = p.get('fecha_desde')
        fecha_hasta = p.get('fecha_hasta')
        responsable = p.get('responsable')
        estado_hato = p.get('estado_hato')
        corraleta = p.get('corraleta')

        if fecha:
            qs = qs.filter(fecha=fecha)
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)
        if responsable:
            qs = qs.filter(responsable__id=responsable)
        if estado_hato:
            qs = qs.filter(estado_hato=estado_hato)
        if corraleta:
            qs = qs.filter(paradas__corraleta__id=corraleta).distinct()

        return qs

    def perform_create(self, serializer):
        extra = {
            'created_by': self.request.user,
            'estado': RecorridoGanado.Estado.FINALIZADO,
        }
        if 'responsable' not in serializer.validated_data:
            extra['responsable'] = self.request.user
        recorrido = serializer.save(**extra)
        _vincular_plan_si_existe(recorrido)


class IniciarRecorridoView(generics.CreateAPIView):
    serializer_class = IniciarRecorridoSerializer
    permission_classes = [IsAuthenticated, PuedeCrearRecorrido]

    def perform_create(self, serializer):
        extra = {'created_by': self.request.user}
        if 'responsable' not in serializer.validated_data:
            extra['responsable'] = self.request.user
        serializer.save(**extra)


class ResumenGanadoView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerRecorridos]

    def get(self, request):
        qs = _qs_recorrido_base(request.user)
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)

        total_mes = qs.filter(fecha__gte=inicio_mes).count()

        ultimo = qs.filter(estado=RecorridoGanado.Estado.FINALIZADO).first()
        ultimo_data = None
        if ultimo:
            ultimo_data = {
                'id': ultimo.id,
                'fecha': ultimo.fecha,
                'responsable': ultimo.responsable.get_full_name() or ultimo.responsable.username,
                'estado_hato': ultimo.estado_hato,
                'numero_cabezas': ultimo.numero_cabezas,
            }

        alertas = qs.filter(
            fecha__gte=inicio_mes,
            estado_hato__in=[RecorridoGanado.EstadoHato.ALERTA, RecorridoGanado.EstadoHato.CRITICO],
        ).count()

        return Response({
            'total_mes': total_mes,
            'ultimo_recorrido': ultimo_data,
            'alertas_mes': alertas,
        })


class RecorridoGanadoDetailView(generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), PuedeEliminarRecorrido()]
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeCrearRecorrido()]
        return [IsAuthenticated(), PuedeVerRecorridos()]

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return RecorridoGanadoCreateSerializer
        return RecorridoGanadoSerializer

    def get_queryset(self):
        return _qs_recorrido_base(self.request.user)


class AgregarParadaView(APIView):
    permission_classes = [IsAuthenticated, PuedeCrearRecorrido]

    def post(self, request, pk):
        qs = _qs_recorrido_base(request.user)
        recorrido = get_object_or_404(qs, pk=pk)
        if recorrido.estado != RecorridoGanado.Estado.EN_CURSO:
            return Response(
                {'detail': 'El recorrido ya fue finalizado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AgregarParadaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        max_orden = recorrido.paradas.aggregate(m=Max('orden'))['m'] or 0
        parada = serializer.save(recorrido=recorrido, orden=max_orden + 1)
        return Response(
            ParadaRecorridoSerializer(parada).data,
            status=status.HTTP_201_CREATED,
        )


class EliminarParadaView(APIView):
    permission_classes = [IsAuthenticated, PuedeCrearRecorrido]

    def delete(self, request, pk, parada_id):
        qs = _qs_recorrido_base(request.user)
        recorrido = get_object_or_404(qs, pk=pk)
        if recorrido.estado != RecorridoGanado.Estado.EN_CURSO:
            return Response(
                {'detail': 'El recorrido ya fue finalizado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parada = get_object_or_404(ParadaRecorrido, pk=parada_id, recorrido=recorrido)
        parada.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SyncParadasView(APIView):
    """Reemplaza todas las paradas de un recorrido con las capturadas offline."""
    permission_classes = [IsAuthenticated, PuedeCrearRecorrido]

    def post(self, request, pk):
        recorrido = get_object_or_404(RecorridoGanado, pk=pk)
        es_admin = request.user.rol in ROLES_ADMIN
        if recorrido.responsable_id != request.user.id and not es_admin:
            return Response(
                {'detail': 'No tienes permiso para sincronizar este recorrido.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SyncParadasSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        recorrido.paradas.all().delete()
        for item in serializer.validated_data['paradas']:
            ParadaRecorrido.objects.create(
                recorrido=recorrido,
                corraleta=item.get('corraleta'),
                nombre_libre=item.get('nombre_libre') or None,
                lat=item.get('lat'),
                lng=item.get('lng'),
                orden=item['orden'],
                hora_llegada=item.get('timestamp'),
            )

        recorrido.refresh_from_db()
        return Response(RecorridoGanadoSerializer(recorrido).data)


class HeatmapPastoreoView(APIView):
    """Coordenadas de paradas de recorridos finalizados agrupadas en celdas de ~100m, con su peso de visitas."""
    permission_classes = [IsAuthenticated, PuedeVerHeatmap]
    GRID_DECIMALS = 3  # ~111m de precisión

    def get(self, request):
        qs = RecorridoGanado.objects.filter(
            estado=RecorridoGanado.Estado.FINALIZADO, tipo=RecorridoGanado.Tipo.REAL,
        )
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)

        paradas = ParadaRecorrido.objects.filter(recorrido__in=qs).select_related('corraleta')

        # El peso cuenta recorridos distintos por celda, no paradas: una sola
        # salida con varias paradas vecinas (p.ej. un corral con 3 trampas) no
        # debe inflar el peso como si llevara visitas acumuladas en el tiempo.
        buckets = {}
        vistos = set()
        for parada in paradas:
            if parada.corraleta_id:
                lat, lng = parada.corraleta.lat, parada.corraleta.lng
                nombre = parada.corraleta.nombre
            else:
                lat, lng = parada.lat, parada.lng
                nombre = parada.nombre_libre or 'Punto libre'
            if lat is None or lng is None:
                continue
            key = (round(float(lat), self.GRID_DECIMALS), round(float(lng), self.GRID_DECIMALS))
            visto_key = (parada.recorrido_id, key)
            if visto_key in vistos:
                continue
            vistos.add(visto_key)
            if key not in buckets:
                buckets[key] = {'lat': key[0], 'lng': key[1], 'nombre': nombre, 'weight': 0}
            buckets[key]['weight'] += 1

        data = list(buckets.values())
        return Response(data)


class FinalizarRecorridoView(APIView):
    permission_classes = [IsAuthenticated, PuedeCrearRecorrido]

    def patch(self, request, pk):
        qs = _qs_recorrido_base(request.user)
        recorrido = get_object_or_404(qs, pk=pk)
        if recorrido.estado == RecorridoGanado.Estado.FINALIZADO:
            return Response(
                {'detail': 'El recorrido ya fue finalizado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FinalizarRecorridoSerializer(recorrido, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(estado=RecorridoGanado.Estado.FINALIZADO, hora_fin=timezone.now())
        recorrido.refresh_from_db()
        _vincular_plan_si_existe(recorrido)
        return Response(RecorridoGanadoSerializer(recorrido).data)


class FotoRecorridoListView(APIView):
    permission_classes = [IsAuthenticated, PuedeCrearRecorrido]

    def post(self, request, pk):
        qs = _qs_recorrido_base(request.user)
        recorrido = get_object_or_404(qs, pk=pk)

        serializer = FotoRecorridoSerializer(
            data=request.data,
            context={'recorrido': recorrido, 'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(recorrido=recorrido, uploaded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FotoRecorridoDeleteView(APIView):
    permission_classes = [IsAuthenticated, PuedeEliminarRecorrido]

    def delete(self, request, pk, foto_id):
        foto = get_object_or_404(FotoRecorrido, pk=foto_id, recorrido_id=pk)
        foto.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CrearPlanView(APIView):
    """Alberto arma el plan del día antes de que salgan los vaqueros (junta 7:15 AM)."""
    permission_classes = [IsAuthenticated, PuedeGestionarPlan]

    def post(self, request):
        serializer = CrearPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        fecha = serializer.validated_data['fecha']
        if RecorridoGanado.objects.filter(fecha=fecha, tipo=RecorridoGanado.Tipo.PLANEADO).exists():
            return Response(
                {'detail': 'Ya existe un plan para esta fecha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = RecorridoGanado.objects.create(
            fecha=fecha,
            responsable=request.user,
            created_by=request.user,
            tipo=RecorridoGanado.Tipo.PLANEADO,
            estado=RecorridoGanado.Estado.FINALIZADO,
            narrativa=serializer.validated_data.get('narrativa_plan', ''),
        )
        for item in serializer.validated_data['paradas']:
            ParadaRecorrido.objects.create(
                recorrido=plan, corraleta=item['corraleta'], orden=item['orden'],
            )
        return Response(PlanRecorridoSerializer(plan).data, status=status.HTTP_201_CREATED)


class EditarPlanView(APIView):
    """Solo editable mientras no exista un recorrido real vinculado."""
    permission_classes = [IsAuthenticated, PuedeGestionarPlan]

    def patch(self, request, pk):
        plan = get_object_or_404(RecorridoGanado, pk=pk, tipo=RecorridoGanado.Tipo.PLANEADO)
        if plan.recorridos_reales.exists():
            return Response(
                {'detail': 'No se puede editar: ya existe un recorrido real vinculado a este plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EditarPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        plan.narrativa = serializer.validated_data.get('narrativa_plan', '')
        plan.save(update_fields=['narrativa'])
        plan.paradas.all().delete()
        for item in serializer.validated_data['paradas']:
            ParadaRecorrido.objects.create(
                recorrido=plan, corraleta=item['corraleta'], orden=item['orden'],
            )
        plan.refresh_from_db()
        return Response(PlanRecorridoSerializer(plan).data)


class PlanDelDiaView(APIView):
    """Cualquier rol autenticado puede consultar el plan del día — los vaqueros lo ven antes de salir."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha = request.query_params.get('fecha')
        if not fecha:
            return Response(
                {'detail': 'El parámetro fecha es requerido.'}, status=status.HTTP_400_BAD_REQUEST,
            )
        plan = RecorridoGanado.objects.filter(
            fecha=fecha, tipo=RecorridoGanado.Tipo.PLANEADO,
        ).prefetch_related('paradas__corraleta').first()
        if not plan:
            return Response(
                {'detail': 'No hay plan para esta fecha.'}, status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PlanRecorridoSerializer(plan).data)


class ClasificacionCorraletasView(APIView):
    """Clasifica cada corraleta por presión de pastoreo según percentiles de visitas históricas."""
    permission_classes = [IsAuthenticated, PuedeVerClasificacion]

    def get(self, request):
        qs = RecorridoGanado.objects.filter(
            estado=RecorridoGanado.Estado.FINALIZADO, tipo=RecorridoGanado.Tipo.REAL,
        )
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)

        # Una corraleta visitada varias veces en el mismo recorrido cuenta una sola vez,
        # igual que en el heatmap: el peso mide recorridos distintos, no paradas.
        visitas_por_corraleta = {}
        paradas = ParadaRecorrido.objects.filter(
            recorrido__in=qs, corraleta__isnull=False,
        ).values('corraleta_id', 'recorrido_id').distinct()
        for p in paradas:
            visitas_por_corraleta[p['corraleta_id']] = visitas_por_corraleta.get(p['corraleta_id'], 0) + 1

        valores = sorted(v for v in visitas_por_corraleta.values() if v > 0)
        p25 = _percentil(valores, 0.25)
        p75 = _percentil(valores, 0.75)

        data = []
        for corraleta in Corraleta.objects.filter(activa=True):
            visitas = visitas_por_corraleta.get(corraleta.id, 0)
            if visitas == 0:
                clase = 'sin_uso'
            elif visitas >= p75:
                clase = 'alta'
            elif visitas <= p25:
                clase = 'baja'
            else:
                clase = 'media'
            data.append({
                'id': corraleta.id,
                'nombre': corraleta.nombre,
                'lat': corraleta.lat,
                'lng': corraleta.lng,
                'visitas': visitas,
                'clase': clase,
            })

        data.sort(key=lambda item: -item['visitas'])
        return Response(data)
