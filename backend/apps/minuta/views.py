from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Minuta
from .pdf import generar_pdf_minuta
from .permissions import PuedeVerMinuta
from .serializers import GenerarMinutaSerializer, MinutaSerializer
from .services import obtener_datos_dia


def _parse_fecha(fecha_str):
    fecha = parse_date(fecha_str)
    return fecha


class MinutaListView(generics.ListAPIView):
    """Historial de minutas ya generadas, para navegar días anteriores."""

    queryset = Minuta.objects.select_related('generada_por')
    serializer_class = MinutaSerializer
    permission_classes = [IsAuthenticated, PuedeVerMinuta]


class MinutaDetalleView(APIView):
    """GET /minuta/<fecha>/ — agrega en vivo lo capturado ese día en los demás módulos,
    más la minuta ya generada (notas, quién la generó) si existe."""

    permission_classes = [IsAuthenticated, PuedeVerMinuta]

    def get(self, request, fecha):
        fecha_parseada = _parse_fecha(fecha)
        if fecha_parseada is None:
            return Response({'detail': 'Fecha inválida, usa formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        minuta = Minuta.objects.select_related('generada_por').filter(fecha=fecha_parseada).first()
        return Response({
            'fecha': fecha_parseada,
            'minuta': MinutaSerializer(minuta).data if minuta else None,
            'datos': obtener_datos_dia(fecha_parseada),
        })


class GenerarMinutaView(APIView):
    """POST /minuta/<fecha>/generar/ — crea o actualiza la minuta del día (notas +
    quién la generó). Idempotente: volver a generar el mismo día solo actualiza notas."""

    permission_classes = [IsAuthenticated, PuedeVerMinuta]

    def post(self, request, fecha):
        fecha_parseada = _parse_fecha(fecha)
        if fecha_parseada is None:
            return Response({'detail': 'Fecha inválida, usa formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = GenerarMinutaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        minuta, _creada = Minuta.objects.update_or_create(
            fecha=fecha_parseada,
            defaults={'generada_por': request.user, 'notas': serializer.validated_data['notas']},
        )

        return Response(MinutaSerializer(minuta).data, status=status.HTTP_200_OK)


class MinutaPDFView(APIView):
    """GET /minuta/<fecha>/pdf/ — descarga el PDF de la minuta con los datos agregados
    de ese día y las notas guardadas, si la minuta ya fue generada."""

    permission_classes = [IsAuthenticated, PuedeVerMinuta]

    def get(self, request, fecha):
        fecha_parseada = _parse_fecha(fecha)
        if fecha_parseada is None:
            return Response({'detail': 'Fecha inválida, usa formato YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        minuta = Minuta.objects.filter(fecha=fecha_parseada).first()
        notas = minuta.notas if minuta else ''

        pdf_bytes = generar_pdf_minuta(fecha_parseada, obtener_datos_dia(fecha_parseada), notas)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="minuta_{fecha_parseada.isoformat()}.pdf"'
        return response
