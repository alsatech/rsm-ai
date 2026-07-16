from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CategoriaInventario, MovimientoInventario, Producto, Ubicacion
from .permissions import (
    PuedeGestionarCatalogo,
    PuedeRegistrarMovimiento,
    PuedeValidarMovimiento,
    PuedeVerAlertas,
    PuedeVerReportesCompletos,
    ROLES_REPORTES_COMPLETOS,
)
from .serializers import (
    CategoriaInventarioSerializer,
    MovimientoInventarioSerializer,
    ProductoSerializer,
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
