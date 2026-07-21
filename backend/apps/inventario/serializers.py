from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import (
    CategoriaInventario,
    EnvioMaterial,
    FotoEnvio,
    ItemRecepcion,
    ItemSolicitud,
    MovimientoInventario,
    Producto,
    RecepcionMaterial,
    ReporteFaltanteDanio,
    SolicitudMaterial,
    Ubicacion,
)
from .permissions import ROLES_REGISTRAN_ENTRADA

User = get_user_model()


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class CategoriaInventarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaInventario
        fields = ('id', 'nombre', 'descripcion', 'color', 'icono', 'created_at')
        read_only_fields = ('id', 'created_at')


class UbicacionSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)

    class Meta:
        model = Ubicacion
        fields = ('id', 'nombre', 'nombre_display', 'descripcion')
        read_only_fields = ('id',)


class ProductoSerializer(serializers.ModelSerializer):
    categoria_detalle = CategoriaInventarioSerializer(source='categoria', read_only=True)
    ubicacion_detalle = UbicacionSerializer(source='ubicacion', read_only=True)
    unidad_medida_display = serializers.CharField(source='get_unidad_medida_display', read_only=True)
    estado_stock = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = (
            'id', 'codigo', 'descripcion', 'categoria', 'categoria_detalle', 'ubicacion', 'ubicacion_detalle',
            'unidad_medida', 'unidad_medida_display', 'stock_actual', 'stock_minimo', 'estado_stock',
            'notas', 'activo', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'stock_actual', 'created_at', 'updated_at')

    def get_estado_stock(self, obj):
        if obj.stock_actual <= 0:
            return 'critico'
        if obj.stock_minimo and obj.stock_minimo > 0 and obj.stock_actual <= obj.stock_minimo:
            return 'bajo'
        return 'normal'


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    responsable = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    responsable_detalle = UsuarioResumenSerializer(source='responsable', read_only=True)
    validado_por_detalle = UsuarioResumenSerializer(source='validado_por', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = (
            'id', 'producto', 'producto_detalle', 'tipo', 'tipo_display', 'cantidad',
            'stock_anterior', 'stock_resultante', 'responsable', 'responsable_detalle',
            'uso_descripcion', 'vehiculo_codigo', 'proyecto_referencia', 'fecha_movimiento',
            'fecha_hora_registro', 'validado', 'validado_por', 'validado_por_detalle',
            'rechazado', 'notas', 'foto_evidencia',
        )
        read_only_fields = (
            'id', 'stock_anterior', 'stock_resultante', 'validado', 'validado_por',
            'rechazado', 'fecha_hora_registro',
        )

    def validate(self, data):
        producto = data.get('producto') or getattr(self.instance, 'producto', None)
        tipo = data.get('tipo', getattr(self.instance, 'tipo', None))
        cantidad = data.get('cantidad', getattr(self.instance, 'cantidad', None))

        if cantidad is not None and cantidad <= 0:
            raise serializers.ValidationError({'cantidad': 'La cantidad debe ser mayor a cero.'})

        request = self.context.get('request')
        if request and tipo == MovimientoInventario.Tipo.ENTRADA:
            rol = getattr(request.user, 'rol', None)
            if rol not in ROLES_REGISTRAN_ENTRADA:
                raise serializers.ValidationError({
                    'tipo': 'No tienes permiso para registrar entradas de inventario.'
                })

        if producto and tipo == MovimientoInventario.Tipo.SALIDA and cantidad is not None:
            if cantidad > producto.stock_actual:
                raise serializers.ValidationError({
                    'cantidad': f'No hay suficiente stock. Stock actual: {producto.stock_actual} {producto.get_unidad_medida_display()}.'
                })

        return data

    def create(self, validated_data):
        producto = validated_data['producto']
        tipo = validated_data['tipo']
        cantidad = validated_data['cantidad']

        stock_anterior = producto.stock_actual
        if tipo == MovimientoInventario.Tipo.SALIDA:
            stock_resultante = stock_anterior - cantidad
        else:
            stock_resultante = stock_anterior + cantidad

        if 'responsable' not in validated_data:
            validated_data['responsable'] = self.context['request'].user

        producto.stock_actual = stock_resultante
        producto.save(update_fields=['stock_actual', 'updated_at'])

        # El producto se actualiza antes de crear el movimiento porque la señal
        # post_save (alerta de stock mínimo) lee producto.stock_actual desde la BD.
        movimiento = MovimientoInventario.objects.create(
            stock_anterior=stock_anterior, stock_resultante=stock_resultante, **validated_data,
        )

        return movimiento


class ValidarMovimientoSerializer(serializers.Serializer):
    ACCION_CHOICES = ('validar', 'rechazar')

    accion = serializers.ChoiceField(choices=ACCION_CHOICES)
    nota = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['accion'] == 'rechazar' and not data.get('nota'):
            raise serializers.ValidationError({'nota': 'El rechazo requiere una nota explicando el motivo.'})
        return data

    def save(self):
        movimiento = self.instance
        request = self.context['request']
        accion = self.validated_data['accion']
        nota = self.validated_data.get('nota', '')

        if accion == 'validar':
            movimiento.validado = True
            movimiento.validado_por = request.user
            if nota:
                movimiento.notas = f'{movimiento.notas}\n\nValidado: {nota}'.strip()
        else:
            movimiento.rechazado = True
            movimiento.validado_por = request.user
            movimiento.notas = f'{movimiento.notas}\n\nRechazado: {nota}'.strip()

            producto = movimiento.producto
            producto.stock_actual = movimiento.stock_anterior
            producto.save(update_fields=['stock_actual', 'updated_at'])

        movimiento.save()
        return movimiento


class ItemSolicitudSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)

    class Meta:
        model = ItemSolicitud
        fields = (
            'id', 'producto', 'producto_detalle', 'descripcion_libre', 'cantidad_solicitada',
            'cantidad_enviada', 'cantidad_recibida', 'unidad', 'notas', 'es_producto_nuevo',
        )
        read_only_fields = ('id', 'cantidad_enviada', 'cantidad_recibida')

    def validate(self, data):
        producto = data.get('producto')
        descripcion_libre = data.get('descripcion_libre', '')
        if not producto and not descripcion_libre:
            raise serializers.ValidationError(
                'Cada ítem necesita un producto del catálogo o una descripción de producto nuevo.'
            )
        return data


class SolicitudMaterialSerializer(serializers.ModelSerializer):
    items = ItemSolicitudSerializer(many=True)
    solicitante_detalle = UsuarioResumenSerializer(source='solicitante', read_only=True)
    created_by_detalle = UsuarioResumenSerializer(source='created_by', read_only=True)
    autorizado_por_detalle = UsuarioResumenSerializer(source='autorizado_por', read_only=True)
    area_display = serializers.CharField(source='get_area_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = SolicitudMaterial
        fields = (
            'id', 'folio', 'solicitante', 'solicitante_detalle', 'area', 'area_display',
            'descripcion_necesidad', 'estado', 'estado_display', 'autorizado_por', 'autorizado_por_detalle',
            'autorizado_en', 'notas_autorizacion', 'fecha_requerida', 'created_by', 'created_by_detalle',
            'created_at', 'updated_at', 'items',
        )
        read_only_fields = (
            'id', 'folio', 'solicitante', 'autorizado_por', 'autorizado_en', 'notas_autorizacion',
            'created_by', 'created_at', 'updated_at',
        )

    def validate_estado(self, value):
        if self.instance is None and value not in (
            SolicitudMaterial.Estado.BORRADOR, SolicitudMaterial.Estado.ENVIADA,
        ):
            raise serializers.ValidationError('Al crear una solicitud solo puede quedar en borrador o enviada.')
        return value

    def validate_items(self, value):
        if self.instance is None and not value:
            raise serializers.ValidationError('Agrega al menos un material a la solicitud.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context['request']
        solicitud = SolicitudMaterial.objects.create(
            solicitante=request.user, created_by=request.user, **validated_data,
        )
        for item_data in items_data:
            ItemSolicitud.objects.create(solicitud=solicitud, **item_data)
        return solicitud

    def update(self, instance, validated_data):
        validated_data.pop('items', None)
        return super().update(instance, validated_data)


class AutorizarSolicitudSerializer(serializers.Serializer):
    notas_autorizacion = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        solicitud = self.instance
        request = self.context['request']
        solicitud.estado = SolicitudMaterial.Estado.AUTORIZADA
        solicitud.autorizado_por = request.user
        solicitud.autorizado_en = timezone.now()
        solicitud.notas_autorizacion = self.validated_data.get('notas_autorizacion', '')
        solicitud.save()
        return solicitud


class RechazarSolicitudSerializer(serializers.Serializer):
    notas_autorizacion = serializers.CharField()

    def validate_notas_autorizacion(self, value):
        if not value.strip():
            raise serializers.ValidationError('Debes indicar el motivo del rechazo.')
        return value

    def save(self):
        solicitud = self.instance
        request = self.context['request']
        solicitud.estado = SolicitudMaterial.Estado.RECHAZADA
        solicitud.autorizado_por = request.user
        solicitud.autorizado_en = timezone.now()
        solicitud.notas_autorizacion = self.validated_data['notas_autorizacion']
        solicitud.save()
        return solicitud


class FotoEnvioSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoEnvio
        fields = ('id', 'foto', 'descripcion', 'momento', 'uploaded_by', 'created_at')
        read_only_fields = ('id', 'uploaded_by', 'created_at')


class EnvioMaterialSerializer(serializers.ModelSerializer):
    enviado_por_detalle = UsuarioResumenSerializer(source='enviado_por', read_only=True)
    fotos = FotoEnvioSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = EnvioMaterial
        fields = (
            'id', 'solicitud', 'enviado_por', 'enviado_por_detalle', 'fecha_envio', 'hora_envio',
            'vehiculo', 'notas_envio', 'estado', 'estado_display', 'created_at', 'fotos',
        )
        read_only_fields = ('id', 'solicitud', 'enviado_por', 'estado', 'created_at')


class ItemRecepcionSerializer(serializers.ModelSerializer):
    item_solicitud_detalle = ItemSolicitudSerializer(source='item_solicitud', read_only=True)
    estado_item_display = serializers.CharField(source='get_estado_item_display', read_only=True)

    class Meta:
        model = ItemRecepcion
        fields = (
            'id', 'item_solicitud', 'item_solicitud_detalle', 'cantidad_recibida', 'estado_item',
            'estado_item_display', 'notas', 'foto',
        )
        read_only_fields = ('id',)


class RecepcionMaterialSerializer(serializers.ModelSerializer):
    recibido_por_detalle = UsuarioResumenSerializer(source='recibido_por', read_only=True)
    items = ItemRecepcionSerializer(many=True, read_only=True)
    estado_general_display = serializers.CharField(source='get_estado_general_display', read_only=True)

    class Meta:
        model = RecepcionMaterial
        fields = (
            'id', 'envio', 'recibido_por', 'recibido_por_detalle', 'fecha_recepcion', 'hora_recepcion',
            'estado_general', 'estado_general_display', 'notas', 'created_at', 'items',
        )
        read_only_fields = ('id', 'envio', 'recibido_por', 'created_at')


class ReporteFaltanteDanioSerializer(serializers.ModelSerializer):
    reportado_por_detalle = UsuarioResumenSerializer(source='reportado_por', read_only=True)
    resuelto_por_detalle = UsuarioResumenSerializer(source='resuelto_por', read_only=True)
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    ubicacion_detalle = UbicacionSerializer(source='ubicacion', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = ReporteFaltanteDanio
        fields = (
            'id', 'producto', 'producto_detalle', 'descripcion', 'tipo', 'tipo_display',
            'reportado_por', 'reportado_por_detalle', 'ubicacion', 'ubicacion_detalle', 'foto',
            'estado', 'estado_display', 'resuelto_por', 'resuelto_por_detalle', 'resuelto_en',
            'notas_resolucion', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'reportado_por', 'estado', 'resuelto_por', 'resuelto_en', 'created_at', 'updated_at',
        )

    def create(self, validated_data):
        validated_data['reportado_por'] = self.context['request'].user
        return super().create(validated_data)


class ResolverReporteSerializer(serializers.Serializer):
    notas_resolucion = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        reporte = self.instance
        request = self.context['request']
        reporte.estado = ReporteFaltanteDanio.Estado.RESUELTO
        reporte.resuelto_por = request.user
        reporte.resuelto_en = timezone.now()
        reporte.notas_resolucion = self.validated_data.get('notas_resolucion', '')
        reporte.save()
        return reporte
