import json
from decimal import Decimal, InvalidOperation

from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CategoriaInventario,
    EnvioMaterial,
    FotoEnvio,
    ItemRecepcion,
    MovimientoInventario,
    Producto,
    RecepcionMaterial,
    ReporteFaltanteDanio,
    SolicitudMaterial,
    Ubicacion,
)
from .permissions import (
    PuedeAutorizarSolicitud,
    PuedeCrearSolicitud,
    PuedeEditarSolicitud,
    PuedeGestionarCatalogo,
    PuedeRegistrarEnvio,
    PuedeRegistrarMovimiento,
    PuedeRegistrarRecepcion,
    PuedeReportarFaltante,
    PuedeResolverReporte,
    PuedeValidarMovimiento,
    PuedeVerAlertas,
    PuedeVerReportesCompletos,
    ROLES_REPORTES_COMPLETOS,
)
from .serializers import (
    AutorizarSolicitudSerializer,
    CategoriaInventarioSerializer,
    EnvioMaterialSerializer,
    MovimientoInventarioSerializer,
    ProductoSerializer,
    RecepcionMaterialSerializer,
    RechazarSolicitudSerializer,
    ReporteFaltanteDanioSerializer,
    ResolverReporteSerializer,
    SolicitudMaterialSerializer,
    UbicacionSerializer,
    ValidarMovimientoSerializer,
)


class CategoriaInventarioListView(generics.ListAPIView):
    serializer_class = CategoriaInventarioSerializer
    queryset = CategoriaInventario.objects.all()
    permission_classes = [IsAuthenticated]


class UbicacionListView(generics.ListAPIView):
    serializer_class = UbicacionSerializer
    queryset = Ubicacion.objects.all()
    permission_classes = [IsAuthenticated]


class ProductoListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeGestionarCatalogo()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Producto.objects.select_related('categoria', 'ubicacion')
        p = self.request.query_params

        categoria = p.get('categoria')
        ubicacion = p.get('ubicacion')
        activo = p.get('activo')
        stock_bajo = p.get('stock_bajo')
        q = p.get('q')

        if categoria:
            qs = qs.filter(categoria_id=categoria)
        if ubicacion:
            qs = qs.filter(ubicacion_id=ubicacion)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        if stock_bajo is not None and stock_bajo.lower() == 'true':
            qs = qs.filter(stock_minimo__gt=0, stock_actual__lte=models.F('stock_minimo'))
        if q:
            qs = qs.filter(models.Q(codigo__icontains=q) | models.Q(descripcion__icontains=q))

        return qs


class ProductoDetailView(generics.RetrieveUpdateAPIView):
    queryset = Producto.objects.select_related('categoria', 'ubicacion')
    serializer_class = ProductoSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeGestionarCatalogo()]
        return [IsAuthenticated()]


class ProductoMovimientosView(APIView):
    """GET /productos/{id}/movimientos/ — historial del producto, más reciente primero."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        producto = get_object_or_404(Producto, pk=pk)
        movimientos = producto.movimientos.select_related('producto', 'responsable', 'validado_por')
        if request.user.rol not in ROLES_REPORTES_COMPLETOS:
            movimientos = movimientos.filter(responsable=request.user)
        serializer = MovimientoInventarioSerializer(movimientos, many=True, context={'request': request})
        return Response(serializer.data)


class MovimientoListCreateView(generics.ListCreateAPIView):
    serializer_class = MovimientoInventarioSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeRegistrarMovimiento()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = MovimientoInventario.objects.select_related('producto', 'responsable', 'validado_por')
        user = self.request.user

        if user.rol in ROLES_REPORTES_COMPLETOS:
            pass  # ven todos los movimientos
        else:
            qs = qs.filter(responsable=user)

        p = self.request.query_params
        producto = p.get('producto')
        tipo = p.get('tipo')
        responsable = p.get('responsable')
        fecha = p.get('fecha')
        validado = p.get('validado')

        if producto:
            qs = qs.filter(producto_id=producto)
        if tipo:
            qs = qs.filter(tipo=tipo)
        if responsable:
            qs = qs.filter(responsable_id=responsable)
        if fecha:
            qs = qs.filter(fecha_movimiento=fecha)
        if validado is not None:
            qs = qs.filter(validado=validado.lower() == 'true')

        return qs


class MovimientoDetailView(generics.RetrieveUpdateAPIView):
    queryset = MovimientoInventario.objects.select_related('producto', 'responsable', 'validado_por')
    serializer_class = MovimientoInventarioSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeValidarMovimiento()]
        return [IsAuthenticated()]


class ValidarMovimientoView(APIView):
    permission_classes = [IsAuthenticated, PuedeValidarMovimiento]

    def patch(self, request, pk):
        movimiento = get_object_or_404(MovimientoInventario, pk=pk)
        serializer = ValidarMovimientoSerializer(
            movimiento, data=request.data, context={'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(MovimientoInventarioSerializer(movimiento, context={'request': request}).data)


class AlertasStockView(generics.ListAPIView):
    """GET /alertas-stock/ — productos con stock_actual <= stock_minimo (stock_minimo > 0)."""
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated, PuedeVerAlertas]

    def get_queryset(self):
        return Producto.objects.filter(
            activo=True, stock_minimo__gt=0, stock_actual__lte=models.F('stock_minimo'),
        ).select_related('categoria', 'ubicacion')


class ResumenInventarioView(APIView):
    """GET /resumen/ — para dashboard: total productos, alertas activas, movimientos del día, sin validar."""
    permission_classes = [IsAuthenticated, PuedeVerReportesCompletos]

    def get(self, request):
        hoy = timezone.localdate()

        total_productos = Producto.objects.filter(activo=True).count()
        alertas_stock = Producto.objects.filter(
            activo=True, stock_minimo__gt=0, stock_actual__lte=models.F('stock_minimo'),
        ).count()
        movimientos_hoy = MovimientoInventario.objects.filter(fecha_movimiento=hoy).count()
        entradas_sin_validar = MovimientoInventario.objects.filter(
            tipo=MovimientoInventario.Tipo.ENTRADA, validado=False, rechazado=False,
        ).count()

        return Response({
            'total_productos': total_productos,
            'alertas_stock': alertas_stock,
            'movimientos_hoy': movimientos_hoy,
            'entradas_sin_validar': entradas_sin_validar,
        })


def _parse_items_json(raw):
    """Convierte el campo 'items' (string JSON en multipart, o lista en JSON) a una lista de dicts."""
    if raw is None:
        return None, 'Debes incluir al menos un ítem.'
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, ValueError):
            return None, 'El campo "items" no es un JSON válido.'
    if not isinstance(raw, list) or not raw:
        return None, 'Debes incluir al menos un ítem.'
    return raw, None


def _to_decimal(value, campo):
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValueError(f'"{campo}" debe ser un número válido.')
    if decimal_value <= 0:
        raise ValueError(f'"{campo}" debe ser mayor a cero.')
    return decimal_value


class SolicitudListCreateView(generics.ListCreateAPIView):
    serializer_class = SolicitudMaterialSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrearSolicitud()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = SolicitudMaterial.objects.select_related(
            'solicitante', 'created_by', 'autorizado_por'
        ).prefetch_related('items')
        p = self.request.query_params

        estado = p.get('estado')
        area = p.get('area')
        solicitante = p.get('solicitante')

        if estado:
            qs = qs.filter(estado=estado)
        if area:
            qs = qs.filter(area=area)
        if solicitante:
            qs = qs.filter(solicitante_id=solicitante)

        return qs


class SolicitudDetailView(generics.RetrieveUpdateAPIView):
    queryset = SolicitudMaterial.objects.select_related(
        'solicitante', 'created_by', 'autorizado_por'
    ).prefetch_related('items')
    serializer_class = SolicitudMaterialSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeEditarSolicitud()]
        return [IsAuthenticated()]


class AutorizarSolicitudView(APIView):
    permission_classes = [IsAuthenticated, PuedeAutorizarSolicitud]

    def post(self, request, pk):
        solicitud = get_object_or_404(SolicitudMaterial, pk=pk)
        if solicitud.estado != SolicitudMaterial.Estado.ENVIADA:
            return Response(
                {'detail': 'Solo se pueden autorizar solicitudes en estado "enviada".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AutorizarSolicitudSerializer(
            solicitud, data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SolicitudMaterialSerializer(solicitud).data)


class RechazarSolicitudView(APIView):
    permission_classes = [IsAuthenticated, PuedeAutorizarSolicitud]

    def post(self, request, pk):
        solicitud = get_object_or_404(SolicitudMaterial, pk=pk)
        if solicitud.estado != SolicitudMaterial.Estado.ENVIADA:
            return Response(
                {'detail': 'Solo se pueden rechazar solicitudes en estado "enviada".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = RechazarSolicitudSerializer(
            solicitud, data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SolicitudMaterialSerializer(solicitud).data)


class EnviarSolicitudView(APIView):
    """POST /solicitudes/{id}/enviar/ — registra el EnvioMaterial (Erik: 'Registrar envío')."""

    permission_classes = [IsAuthenticated, PuedeRegistrarEnvio]

    def post(self, request, pk):
        solicitud = get_object_or_404(SolicitudMaterial.objects.prefetch_related('items'), pk=pk)
        if solicitud.estado not in (SolicitudMaterial.Estado.AUTORIZADA, SolicitudMaterial.Estado.EN_COMPRA):
            return Response(
                {'detail': 'Solo se puede registrar el envío de solicitudes autorizadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items, error = _parse_items_json(request.data.get('items'))
        if error:
            return Response({'items': error}, status=status.HTTP_400_BAD_REQUEST)

        fotos = request.FILES.getlist('fotos')
        if not (1 <= len(fotos) <= 4):
            return Response(
                {'fotos': 'Sube entre 1 y 4 fotos de evidencia de salida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items_por_id = {item.id: item for item in solicitud.items.all()}
        actualizaciones = []
        for item_data in items:
            try:
                item_id = int(item_data.get('item_solicitud'))
                item = items_por_id[item_id]
                cantidad = _to_decimal(item_data.get('cantidad_enviada'), 'cantidad_enviada')
            except (TypeError, ValueError, KeyError):
                return Response(
                    {'items': 'Cada ítem debe referenciar un "item_solicitud" válido de esta solicitud y una "cantidad_enviada" numérica mayor a cero.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            actualizaciones.append((item, cantidad))

        envio = EnvioMaterial.objects.create(
            solicitud=solicitud,
            enviado_por=request.user,
            vehiculo=request.data.get('vehiculo', ''),
            notas_envio=request.data.get('notas_envio', ''),
        )

        for item, cantidad in actualizaciones:
            item.cantidad_enviada = cantidad
            item.save(update_fields=['cantidad_enviada'])

        for foto in fotos:
            FotoEnvio.objects.create(envio=envio, foto=foto, momento=FotoEnvio.Momento.SALIDA, uploaded_by=request.user)

        solicitud.estado = SolicitudMaterial.Estado.ENVIADA_RANCHO
        solicitud.save(update_fields=['estado', 'updated_at'])

        return Response(
            EnvioMaterialSerializer(envio, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class RecepcionesSolicitudView(APIView):
    """GET/POST /solicitudes/{id}/recepciones/ — checklist de recepción de campo/inventario."""

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeRegistrarRecepcion()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        solicitud = get_object_or_404(SolicitudMaterial, pk=pk)
        recepciones = RecepcionMaterial.objects.filter(envio__solicitud=solicitud).select_related(
            'recibido_por', 'envio'
        ).prefetch_related('items')
        return Response(RecepcionMaterialSerializer(recepciones, many=True, context={'request': request}).data)

    def post(self, request, pk):
        solicitud = get_object_or_404(SolicitudMaterial.objects.prefetch_related('items'), pk=pk)

        envio_id = request.data.get('envio')
        if envio_id:
            envio = get_object_or_404(EnvioMaterial, pk=envio_id, solicitud=solicitud)
        else:
            envio = solicitud.envios.order_by('-created_at').first()
        if not envio:
            return Response(
                {'envio': 'Esta solicitud todavía no tiene ningún envío registrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if envio.enviado_por_id == request.user.id:
            return Response(
                {'recibido_por': 'Quien recibe el material debe ser distinto de quien lo envió.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estado_general = request.data.get('estado_general')
        if estado_general not in RecepcionMaterial.EstadoGeneral.values:
            return Response({'estado_general': 'Estado general inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        items, error = _parse_items_json(request.data.get('items'))
        if error:
            return Response({'items': error}, status=status.HTTP_400_BAD_REQUEST)

        items_por_id = {item.id: item for item in solicitud.items.all()}
        preparados = []
        for item_data in items:
            try:
                item_id = int(item_data.get('item_solicitud'))
                item_solicitud = items_por_id[item_id]
                cantidad = _to_decimal(item_data.get('cantidad_recibida'), 'cantidad_recibida')
                estado_item = item_data.get('estado_item')
            except (TypeError, ValueError, KeyError):
                return Response(
                    {'items': 'Cada ítem debe referenciar un "item_solicitud" válido y una "cantidad_recibida" numérica mayor a cero.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if estado_item not in ItemRecepcion.EstadoItem.values:
                return Response({'items': f'Estado de ítem inválido: {estado_item}.'}, status=status.HTTP_400_BAD_REQUEST)
            foto = request.FILES.get(f'foto_item_{item_id}')
            preparados.append({
                'item_solicitud': item_solicitud,
                'cantidad_recibida': cantidad,
                'estado_item': estado_item,
                'notas': item_data.get('notas', ''),
                'foto': foto,
            })

        recepcion = RecepcionMaterial(
            envio=envio,
            recibido_por=request.user,
            estado_general=estado_general,
            notas=request.data.get('notas', ''),
        )
        recepcion.full_clean()
        recepcion.save()

        for datos in preparados:
            ItemRecepcion.objects.create(recepcion=recepcion, **datos)
            item_solicitud = datos['item_solicitud']
            item_solicitud.cantidad_recibida = item_solicitud.cantidad_recibida + datos['cantidad_recibida']
            item_solicitud.save(update_fields=['cantidad_recibida'])

        fotos_llegada = request.FILES.getlist('fotos_llegada')
        for foto in fotos_llegada[:4]:
            FotoEnvio.objects.create(envio=envio, foto=foto, momento=FotoEnvio.Momento.LLEGADA, uploaded_by=request.user)

        items_enviados = [item for item in solicitud.items.all() if item.cantidad_enviada > 0]
        if items_enviados:
            todos_completos = all(item.cantidad_recibida >= item.cantidad_enviada for item in items_enviados)
            algo_recibido = any(item.cantidad_recibida > 0 for item in items_enviados)
            envio.estado = EnvioMaterial.Estado.ENTREGADO if todos_completos else EnvioMaterial.Estado.ENTREGADO_PARCIAL
            envio.save(update_fields=['estado'])

            if todos_completos:
                solicitud.estado = SolicitudMaterial.Estado.RECIBIDA_COMPLETA
            elif algo_recibido:
                solicitud.estado = SolicitudMaterial.Estado.RECIBIDA_PARCIAL
            solicitud.save(update_fields=['estado', 'updated_at'])

        return Response(
            RecepcionMaterialSerializer(recepcion, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ComparativoSolicitudView(APIView):
    """GET /solicitudes/{id}/comparativo/ — solicitado vs enviado vs recibido, por ítem."""

    permission_classes = [IsAuthenticated, PuedeVerReportesCompletos]

    def get(self, request, pk):
        solicitud = get_object_or_404(SolicitudMaterial.objects.prefetch_related('items__producto'), pk=pk)
        comparativo = []
        for item in solicitud.items.all():
            diferencia = item.cantidad_recibida - item.cantidad_enviada
            comparativo.append({
                'item_solicitud': item.id,
                'nombre': item.producto.descripcion if item.producto else item.descripcion_libre,
                'unidad': item.unidad or (item.producto.get_unidad_medida_display() if item.producto else ''),
                'cantidad_solicitada': item.cantidad_solicitada,
                'cantidad_enviada': item.cantidad_enviada,
                'cantidad_recibida': item.cantidad_recibida,
                'diferencia': diferencia,
            })
        return Response({'folio': solicitud.folio, 'items': comparativo})


class ReporteFaltanteListCreateView(generics.ListCreateAPIView):
    serializer_class = ReporteFaltanteDanioSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeReportarFaltante()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = ReporteFaltanteDanio.objects.select_related('producto', 'reportado_por', 'ubicacion', 'resuelto_por')
        p = self.request.query_params

        estado = p.get('estado')
        tipo = p.get('tipo')
        if estado:
            qs = qs.filter(estado=estado)
        if tipo:
            qs = qs.filter(tipo=tipo)

        return qs


class ResolverReporteView(APIView):
    permission_classes = [IsAuthenticated, PuedeResolverReporte]

    def patch(self, request, pk):
        reporte = get_object_or_404(ReporteFaltanteDanio, pk=pk)
        serializer = ResolverReporteSerializer(reporte, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReporteFaltanteDanioSerializer(reporte).data)
