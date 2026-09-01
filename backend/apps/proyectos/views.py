from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User

from .models import (
    AvanceProyecto,
    CompraProyecto,
    Contratista,
    CotizacionManoObra,
    FotoAvance,
    FotoCompra,
    ItemProyecto,
    Proyecto,
)
from .permissions import (
    PuedeAutorizar,
    PuedeCrearProyecto,
    PuedeCrudContratistas,
    PuedeGestionarProyecto,
    PuedeRegistrarAvance,
    ROLES_VEN_TODOS,
)
from .serializers import (
    AprobarCotizacionSerializer,
    AutorizarCompraSerializer,
    AutorizarProyectoSerializer,
    AvanceProyectoSerializer,
    CompraProyectoSerializer,
    ContratistaSerializer,
    CotizacionManoObraSerializer,
    DevolucionInventarioSerializer,
    ItemProyectoSerializer,
    MovimientoProyectoSerializer,
    ProyectoSerializer,
    RechazarProyectoSerializer,
    RegistrarMovimientoItemSerializer,
)

MAX_FOTOS_COMPRA = 4
MAX_FOTOS_AVANCE = 6


def _proyectos_visibles(user):
    qs = Proyecto.objects.select_related('creado_por', 'asignado_a', 'autorizado_por')
    if user.rol in ROLES_VEN_TODOS:
        return qs
    if user.rol == User.Rol.OPERACIONES:
        return qs.filter(asignado_a=user)
    return qs.none()


class ProyectoListCreateView(generics.ListCreateAPIView):
    serializer_class = ProyectoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearProyecto()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = _proyectos_visibles(self.request.user)
        p = self.request.query_params
        estado = p.get('estado')
        asignado_a = p.get('asignado_a')
        if estado:
            qs = qs.filter(estado__in=[e for e in estado.split(',') if e])
        if asignado_a:
            qs = qs.filter(asignado_a_id=asignado_a)
        return qs


class ProyectoDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProyectoSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeCrearProyecto()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _proyectos_visibles(self.request.user)


class AutorizarProyectoView(APIView):
    permission_classes = [IsAuthenticated, PuedeAutorizar]

    def post(self, request, pk):
        proyecto = get_object_or_404(Proyecto, pk=pk)
        if proyecto.estado != Proyecto.Estado.BORRADOR:
            return Response(
                {'detail': 'Solo se pueden autorizar proyectos en borrador.'}, status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AutorizarProyectoSerializer(proyecto, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProyectoSerializer(proyecto).data)


class RechazarProyectoView(APIView):
    permission_classes = [IsAuthenticated, PuedeAutorizar]

    def post(self, request, pk):
        proyecto = get_object_or_404(Proyecto, pk=pk)
        if proyecto.estado != Proyecto.Estado.BORRADOR:
            return Response(
                {'detail': 'Solo se pueden rechazar proyectos en borrador.'}, status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = RechazarProyectoSerializer(proyecto, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProyectoSerializer(proyecto).data)


class CotizacionListCreateView(generics.ListCreateAPIView):
    serializer_class = CotizacionManoObraSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeGestionarProyecto()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return CotizacionManoObra.objects.filter(proyecto_id=self.kwargs['pk']).select_related(
            'contratista', 'aprobada_por', 'created_by',
        )

    def perform_create(self, serializer):
        proyecto = get_object_or_404(Proyecto, pk=self.kwargs['pk'])
        serializer.save(proyecto=proyecto)


class AprobarCotizacionView(APIView):
    permission_classes = [IsAuthenticated, PuedeAutorizar]

    def patch(self, request, pk, cotizacion_id):
        cotizacion = get_object_or_404(CotizacionManoObra, pk=cotizacion_id, proyecto_id=pk)
        serializer = AprobarCotizacionSerializer(cotizacion, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CotizacionManoObraSerializer(cotizacion).data)


class CompraProyectoListCreateView(generics.ListCreateAPIView):
    serializer_class = CompraProyectoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeGestionarProyecto()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return CompraProyecto.objects.filter(proyecto_id=self.kwargs['pk']).select_related(
            'contratista_proveedor', 'autorizado_por', 'created_by',
        ).prefetch_related('fotos')

    def create(self, request, *args, **kwargs):
        proyecto = get_object_or_404(Proyecto, pk=kwargs['pk'])
        fotos = request.FILES.getlist('fotos')
        if len(fotos) > MAX_FOTOS_COMPRA:
            return Response(
                {'fotos': f'Máximo {MAX_FOTOS_COMPRA} fotos de evidencia.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        compra = serializer.save(proyecto=proyecto)

        for foto in fotos:
            FotoCompra.objects.create(compra=compra, foto=foto, uploaded_by=request.user)

        return Response(self.get_serializer(compra).data, status=status.HTTP_201_CREATED)


class AutorizarCompraView(APIView):
    permission_classes = [IsAuthenticated, PuedeAutorizar]

    def patch(self, request, pk, compra_id):
        compra = get_object_or_404(CompraProyecto, pk=compra_id, proyecto_id=pk)
        if not compra.requiere_autorizacion:
            return Response(
                {'detail': 'Esta compra no requiere autorización.'}, status=status.HTTP_400_BAD_REQUEST,
            )
        if compra.estado != CompraProyecto.Estado.PENDIENTE_AUTORIZACION:
            return Response(
                {'detail': 'Esta compra ya fue procesada.'}, status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AutorizarCompraSerializer(compra, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CompraProyectoSerializer(compra).data)


class AvanceProyectoListCreateView(generics.ListCreateAPIView):
    serializer_class = AvanceProyectoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeRegistrarAvance()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return AvanceProyecto.objects.filter(proyecto_id=self.kwargs['pk']).select_related(
            'registrado_por',
        ).prefetch_related('fotos')

    def create(self, request, *args, **kwargs):
        proyecto = get_object_or_404(Proyecto, pk=kwargs['pk'])
        fotos = request.FILES.getlist('fotos')
        if not (1 <= len(fotos) <= MAX_FOTOS_AVANCE):
            return Response(
                {'fotos': f'Sube entre 1 y {MAX_FOTOS_AVANCE} fotos de evidencia del avance.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        avance = serializer.save(proyecto=proyecto)

        for foto in fotos:
            FotoAvance.objects.create(avance=avance, foto=foto, uploaded_by=request.user)

        return Response(self.get_serializer(avance).data, status=status.HTTP_201_CREATED)


class ItemProyectoListCreateView(generics.ListCreateAPIView):
    serializer_class = ItemProyectoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeGestionarProyecto()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return ItemProyecto.objects.filter(proyecto_id=self.kwargs['pk']).select_related('producto_ref')

    def perform_create(self, serializer):
        proyecto = get_object_or_404(Proyecto, pk=self.kwargs['pk'])
        serializer.save(proyecto=proyecto)


class RegistrarMovimientoItemView(APIView):
    permission_classes = [IsAuthenticated, PuedeGestionarProyecto]

    def post(self, request, pk, item_id):
        item = get_object_or_404(ItemProyecto, pk=item_id, proyecto_id=pk)
        serializer = RegistrarMovimientoItemSerializer(
            data=request.data, context={'item': item, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        movimiento = serializer.save()
        return Response(MovimientoProyectoSerializer(movimiento).data, status=status.HTTP_201_CREATED)


class DevolverItemView(APIView):
    permission_classes = [IsAuthenticated, PuedeGestionarProyecto]

    def post(self, request, pk, item_id):
        item = get_object_or_404(ItemProyecto, pk=item_id, proyecto_id=pk)
        serializer = DevolucionInventarioSerializer(
            data=request.data, context={'item': item, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        devolucion = serializer.save()
        item.refresh_from_db()
        return Response(
            {'item': ItemProyectoSerializer(item).data, 'devolucion_id': devolucion.id},
            status=status.HTTP_201_CREATED,
        )


class ContratistaListCreateView(generics.ListCreateAPIView):
    serializer_class = ContratistaSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrudContratistas()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Contratista.objects.select_related('created_by')
        p = self.request.query_params
        q = p.get('q')
        activo = p.get('activo')
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(nombre__icontains=q) | Q(especialidad__icontains=q) | Q(empresa__icontains=q))
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        return qs


class ContratistaDetailView(generics.RetrieveUpdateAPIView):
    queryset = Contratista.objects.select_related('created_by')
    serializer_class = ContratistaSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeCrudContratistas()]
        return [IsAuthenticated()]


class ResumenProyectosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _proyectos_visibles(request.user)
        hoy = timezone.localdate()

        return Response({
            'en_progreso': qs.filter(estado=Proyecto.Estado.EN_PROGRESO).count(),
            'pendientes_autorizacion': qs.filter(
                estado=Proyecto.Estado.BORRADOR, requiere_autorizacion=True,
            ).count(),
            'completados_mes': qs.filter(
                estado=Proyecto.Estado.COMPLETADO,
                fecha_fin_real__year=hoy.year,
                fecha_fin_real__month=hoy.month,
            ).count(),
            'total': qs.count(),
        })
