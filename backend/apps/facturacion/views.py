from io import BytesIO

from django.core.files.base import ContentFile
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventario.models import Compra
from apps.proyectos.models import CompraProyecto

from .excel import generar_excel_relacion
from .models import Factura, RelacionMensual
from .permissions import EsSuperadmin, PuedeVerFacturacion, PuedeVerResumen
from .serializers import (
    FacturaSerializer,
    GenerarRelacionSerializer,
    ImportarFacturasSerializer,
    RelacionMensualSerializer,
)

MODULOS_IMPORTABLES = ('inventario', 'proyectos')


class FacturaListCreateView(generics.ListCreateAPIView):
    serializer_class = FacturaSerializer
    permission_classes = [IsAuthenticated, PuedeVerFacturacion]

    def get_queryset(self):
        qs = Factura.objects.select_related('registrado_por')
        p = self.request.query_params
        mes = p.get('mes')
        modulo_origen = p.get('modulo_origen')
        q = p.get('q')
        if mes:
            qs = qs.filter(mes_reporte=mes)
        if modulo_origen:
            qs = qs.filter(modulo_origen=modulo_origen)
        if q:
            qs = qs.filter(Q(concepto__icontains=q) | Q(numero_factura__icontains=q))
        return qs


class FacturaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Factura.objects.select_related('registrado_por')
    serializer_class = FacturaSerializer
    permission_classes = [IsAuthenticated, PuedeVerFacturacion]


class FacturasPorMesView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerFacturacion]

    def get(self, request):
        mes = request.query_params.get('mes')
        if not mes:
            return Response({'detail': 'Debes indicar el mes (formato YYYY-MM).'}, status=status.HTTP_400_BAD_REQUEST)
        facturas = Factura.objects.select_related('registrado_por').filter(mes_reporte=mes).order_by('fecha')
        return Response(FacturaSerializer(facturas, many=True, context={'request': request}).data)


class ResumenFacturacionView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerResumen]

    def get(self, request):
        hoy = timezone.localdate()
        mes_actual = f'{hoy.year}-{hoy.month:02d}'
        qs = Factura.objects.filter(mes_reporte=mes_actual)

        desglose = list(
            qs.values('modulo_origen').annotate(total=Sum('importe'), numero_facturas=Count('id')).order_by('-total')
        )

        return Response({
            'mes': mes_actual,
            'total': qs.aggregate(total=Sum('importe'))['total'] or 0,
            'numero_facturas': qs.count(),
            'desglose_por_modulo': desglose,
        })


class GenerarRelacionView(APIView):
    permission_classes = [IsAuthenticated, EsSuperadmin]

    def post(self, request):
        serializer = GenerarRelacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mes = serializer.validated_data['mes']

        facturas = Factura.objects.filter(mes_reporte=mes).order_by('fecha')
        if not facturas.exists():
            return Response(
                {'detail': f'No hay facturas registradas para {mes}.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        wb, total = generar_excel_relacion(facturas)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        relacion, _ = RelacionMensual.objects.update_or_create(
            mes=mes,
            defaults={'generado_por': request.user, 'total': total, 'numero_facturas': facturas.count()},
        )
        relacion.archivo_excel.save(f'Relacion_{mes}_RSM.xlsx', ContentFile(buffer.read()), save=True)

        return Response(
            RelacionMensualSerializer(relacion, context={'request': request}).data, status=status.HTTP_201_CREATED,
        )


class RelacionMensualListView(generics.ListAPIView):
    queryset = RelacionMensual.objects.select_related('generado_por')
    serializer_class = RelacionMensualSerializer
    permission_classes = [IsAuthenticated, PuedeVerFacturacion]


def _archivo_nombre(campo_archivo):
    return campo_archivo.name.rsplit('/', 1)[-1]


class ImportarFacturasView(APIView):
    """Vista 4 del frontend: Minerva jala manualmente las compras con factura adjunta que Erik
    ya subió en Inventarios/Proyectos, en vez de que lleguen automáticas — ver CLAUDE.md."""

    permission_classes = [IsAuthenticated, EsSuperadmin]

    def get(self, request):
        modulo = request.query_params.get('modulo')
        if modulo not in MODULOS_IMPORTABLES:
            return Response(
                {'detail': 'Módulo inválido. Usa "inventario" o "proyectos".'}, status=status.HTTP_400_BAD_REQUEST,
            )

        ya_importadas = set(
            Factura.objects.filter(modulo_origen=modulo).values_list('referencia_id', flat=True)
        )

        if modulo == 'inventario':
            compras = Compra.objects.select_related('comprado_por').order_by('-fecha_compra')
            data = [
                {
                    'id': c.id,
                    'fecha': c.fecha_compra,
                    'concepto': c.proveedor or f'Compra de inventario #{c.id}',
                    'importe': c.monto_total,
                    'archivo_url': request.build_absolute_uri(c.foto_factura.url) if c.foto_factura else None,
                    'ya_importada': c.id in ya_importadas,
                }
                for c in compras
            ]
        else:
            compras = (
                CompraProyecto.objects.select_related('proyecto', 'contratista_proveedor')
                .prefetch_related('fotos')
                .order_by('-fecha_compra', '-created_at')
            )
            data = []
            for c in compras:
                foto = c.fotos.first()
                if not foto:
                    continue
                proveedor = c.contratista_proveedor.nombre if c.contratista_proveedor_id else c.proveedor_nombre
                data.append({
                    'id': c.id,
                    'fecha': c.fecha_compra,
                    'concepto': proveedor or c.descripcion[:300],
                    'importe': c.monto_total,
                    'archivo_url': request.build_absolute_uri(foto.foto.url),
                    'ya_importada': c.id in ya_importadas,
                    'referencia_descripcion': f'{c.folio_compra} — proyecto {c.proyecto.folio}',
                })

        return Response(data)

    def post(self, request):
        serializer = ImportarFacturasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        modulo = serializer.validated_data['modulo']
        ids = serializer.validated_data['ids']

        ya_importadas = set(
            Factura.objects.filter(modulo_origen=modulo, referencia_id__in=ids).values_list('referencia_id', flat=True)
        )
        ids_nuevas = [i for i in ids if i not in ya_importadas]

        creadas = []
        if modulo == 'inventario':
            for compra in Compra.objects.filter(id__in=ids_nuevas):
                factura = Factura(
                    numero_factura=f'INV-{compra.id}',
                    fecha=compra.fecha_compra,
                    concepto=compra.proveedor or f'Compra de inventario #{compra.id}',
                    importe=compra.monto_total,
                    modulo_origen=Factura.ModuloOrigen.INVENTARIO,
                    referencia_id=compra.id,
                    referencia_descripcion=f'Compra de inventario #{compra.id}',
                    notas=compra.notas,
                    registrado_por=request.user,
                )
                if compra.foto_factura:
                    factura.archivo.save(
                        _archivo_nombre(compra.foto_factura), ContentFile(compra.foto_factura.read()), save=False,
                    )
                factura.save()
                creadas.append(factura)
        else:
            compras = (
                CompraProyecto.objects.filter(id__in=ids_nuevas)
                .select_related('proyecto', 'contratista_proveedor')
                .prefetch_related('fotos')
            )
            for compra in compras:
                foto = compra.fotos.first()
                proveedor = compra.contratista_proveedor.nombre if compra.contratista_proveedor_id else compra.proveedor_nombre
                factura = Factura(
                    numero_factura=compra.folio_compra,
                    fecha=compra.fecha_compra or timezone.localdate(),
                    concepto=proveedor or compra.descripcion[:300],
                    importe=compra.monto_total,
                    modulo_origen=Factura.ModuloOrigen.PROYECTOS,
                    referencia_id=compra.id,
                    referencia_descripcion=f'{compra.folio_compra} — proyecto {compra.proyecto.folio}',
                    notas=compra.notas,
                    registrado_por=request.user,
                )
                if foto:
                    factura.archivo.save(_archivo_nombre(foto.foto), ContentFile(foto.foto.read()), save=False)
                factura.save()
                creadas.append(factura)

        return Response(
            FacturaSerializer(creadas, many=True, context={'request': request}).data, status=status.HTTP_201_CREATED,
        )
