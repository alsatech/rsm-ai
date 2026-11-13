from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User

from .importar_archivo import buscar_responsables, extraer_pendientes
from .models import FotoPendiente, HistorialPendiente, Pendiente
from .permissions import (
    PuedeCambiarEstado,
    PuedeCrearPendiente,
    PuedeEditarPendiente,
    PuedeEliminarFoto,
    PuedeEliminarPendiente,
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
        fecha_asignacion = p.get('fecha_asignacion')
        fecha_desde = p.get('fecha_desde')
        fecha_hasta = p.get('fecha_hasta')

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
        if fecha_asignacion:
            qs = qs.filter(fecha_asignacion=fecha_asignacion)
        if fecha_desde:
            qs = qs.filter(created_at__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(created_at__date__lte=fecha_hasta)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PendienteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PendienteSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeEditarPendiente()]
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), PuedeEliminarPendiente()]
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
        qs = Pendiente.objects.prefetch_related('asignado_a', 'fotos')
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
        solucion_cierre = serializer.validated_data.get('solucion_cierre', '').strip()
        se_compro_material = serializer.validated_data.get('se_compro_material')
        quien_compro = serializer.validated_data.get('quien_compro', '').strip()
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

        if nuevo_estado == Pendiente.Estado.CERRADO:
            errores = {}
            if not solucion_cierre:
                errores['solucion_cierre'] = 'Describe la solución antes de cerrar el pendiente.'
            if se_compro_material and not quien_compro:
                errores['quien_compro'] = 'Indica quién realizó la compra del material.'
            tiene_foto_cierre = pendiente.fotos.filter(momento='cierre').exists()
            if not tiene_foto_cierre:
                errores['foto_cierre'] = 'Sube al menos una foto de evidencia del cierre antes de cerrar.'
            if errores:
                return Response(errores, status=status.HTTP_400_BAD_REQUEST)

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
            pendiente.solucion_cierre = solucion_cierre
            pendiente.se_compro_material = se_compro_material
            pendiente.quien_compro = quien_compro if se_compro_material else ''
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


MAX_ARCHIVO_BYTES = 10 * 1024 * 1024


class ImportarPendientesArchivoView(APIView):
    """POST /pendientes/importar-archivo/ (multipart, campo 'archivo') — lee las tablas de
    pendientes/acuerdos en seguimiento de un .docx (minuta operativa) o .pdf y los crea de
    inmediato. Omite los que ya existen sin terminar (mismo número de seguimiento o mismo
    título), para que subir dos veces el mismo archivo no duplique."""

    permission_classes = [IsAuthenticated, PuedeCrearPendiente]
    parser_classes = [MultiPartParser]

    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Selecciona un archivo (.docx o .pdf).'}, status=status.HTTP_400_BAD_REQUEST)
        if not archivo.name.lower().endswith(('.docx', '.pdf')) or archivo.size > MAX_ARCHIVO_BYTES:
            return Response(
                {'detail': 'El archivo debe ser Word (.docx) o PDF, de máximo 10 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            detectados = extraer_pendientes(archivo, archivo.name)
        except Exception:
            return Response(
                {'detail': 'No se pudo leer el archivo. Verifica que no esté dañado ni protegido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not detectados:
            return Response(
                {'detail': 'No se encontraron pendientes. El archivo debe traer una tabla de seguimiento '
                           '(columnas como "Acuerdo en seguimiento" o "Pendiente"). Si es un PDF escaneado '
                           '(imagen) no se puede leer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuarios = list(User.objects.filter(is_active=True))
        abiertos = list(
            Pendiente.objects.exclude(estado=Pendiente.Estado.CERRADO).values_list('titulo', flat=True)
        )
        titulos_existentes = {t.strip().lower() for t in abiertos}
        codigos_existentes = {t.split(' · ', 1)[0].strip().lower() for t in abiertos if ' · ' in t}
        creados, omitidos, sin_asignar = [], [], []

        with transaction.atomic():
            for item in detectados:
                clave = item['titulo'].strip().lower()
                codigo = item['codigo'].lower()
                if clave in titulos_existentes or (codigo and codigo in codigos_existentes):
                    omitidos.append(item['titulo'])
                    continue
                asignados, faltantes = buscar_responsables(item['responsables'], usuarios)
                sin_asignar.extend(faltantes)
                pendiente = Pendiente.objects.create(
                    titulo=item['titulo'],
                    descripcion=item['descripcion'],
                    prioridad=item['prioridad'],
                    estado=item['estado'],
                    motivo_bloqueo=item['motivo_bloqueo'],
                    fecha_asignacion=item['fecha_asignacion'],
                    origen=Pendiente.Origen.JUNTA,
                    created_by=request.user,
                )
                pendiente.asignado_a.set(asignados)
                titulos_existentes.add(clave)
                if codigo:
                    codigos_existentes.add(codigo)
                creados.append(pendiente)

        return Response({
            'creados': PendienteSerializer(creados, many=True).data,
            'total_creados': len(creados),
            'omitidos_duplicados': omitidos,
            'responsables_no_encontrados': sorted(set(sin_asignar)),
        }, status=status.HTTP_201_CREATED)
