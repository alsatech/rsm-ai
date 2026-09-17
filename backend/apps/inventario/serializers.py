from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.flota.models import Vehiculo

from .models import (
    CategoriaInventario,
    Compra,
    EnvioMaterial,
    FotoEnvio,
    ItemRecepcion,
    ItemSolicitud,
    MovimientoInventario,
    Producto,
    RecepcionMaterial,
    RelacionCompras,
    ReporteFaltanteDanio,
    SolicitudMaterial,
    Ubicacion,
)

User = get_user_model()

# Nombre canónico de la categoría que agrupa gasolina/diésel. Las salidas de estos
# productos requieren un vehiculo FK (de flota.Vehiculo) — ver MovimientoInventarioSerializer.validate.
CATEGORIA_COMBUSTIBLES = 'Combustibles'


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
    vehiculo = serializers.PrimaryKeyRelatedField(
        queryset=Vehiculo.objects.all(),
        required=False,
        allow_null=True,
    )
    compra = serializers.SerializerMethodField()
    solicitud_folio = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoInventario
        fields = (
            'id', 'producto', 'producto_detalle', 'tipo', 'tipo_display', 'cantidad',
            'stock_anterior', 'stock_resultante', 'responsable', 'responsable_detalle',
            'uso_descripcion', 'vehiculo_codigo', 'vehiculo',
            'proyecto_referencia', 'solicitud', 'solicitud_folio', 'fecha_movimiento',
            'fecha_hora_registro', 'validado', 'validado_por', 'validado_por_detalle',
            'rechazado', 'notas', 'foto_evidencia', 'compra',
        )
        read_only_fields = (
            'id', 'stock_anterior', 'stock_resultante', 'solicitud', 'validado', 'validado_por',
            'rechazado', 'fecha_hora_registro',
        )

    def get_solicitud_folio(self, obj):
        return obj.solicitud.folio if obj.solicitud_id else None

    def get_compra(self, obj):
        compra = getattr(obj, 'compra', None)
        return CompraSerializer(compra).data if compra else None

    def validate(self, data):
        producto = data.get('producto') or getattr(self.instance, 'producto', None)
        tipo = data.get('tipo', getattr(self.instance, 'tipo', None))
        cantidad = data.get('cantidad', getattr(self.instance, 'cantidad', None))

        if cantidad is not None and cantidad <= 0:
            raise serializers.ValidationError({'cantidad': 'La cantidad debe ser mayor a cero.'})

        # Las entradas de inventario ya no se registran por aquí: solo llegan a través de una
        # solicitud de material en Adquisiciones (Solicitud → Envío → Recepción → Dar entrada),
        # que ya no requiere un paso de validación aparte — ver DarEntradaRecepcionView.
        if self.instance is None and tipo == MovimientoInventario.Tipo.ENTRADA:
            raise serializers.ValidationError({
                'tipo': 'Las entradas de inventario solo se registran a través de una solicitud de material en Adquisiciones.'
            })

        # El chequeo de stock/vehículo solo aplica cuando se crea el movimiento o cuando
        # explícitamente se está cambiando la cantidad — así un PATCH que solo agrega
        # observaciones (notas) no vuelve a disparar estas validaciones contra el stock
        # actual, que puede haber bajado por movimientos posteriores.
        revisando_cantidad = self.instance is None or 'cantidad' in data
        if producto and tipo == MovimientoInventario.Tipo.SALIDA and cantidad is not None and revisando_cantidad:
            if cantidad > producto.stock_actual:
                raise serializers.ValidationError({
                    'cantidad': f'No hay suficiente stock. Stock actual: {producto.stock_actual} {producto.get_unidad_medida_display()}.'
                })

            # Salidas de combustibles (gasolina/diésel) requieren vehiculo de la flota.
            # Se valida por nombre de categoría porque la FK a CategoriaInventario puede
            # cambiar entre instancias y solo nos interesa el caso "Combustibles".
            categoria = getattr(producto, 'categoria', None)
            if categoria and categoria.nombre == CATEGORIA_COMBUSTIBLES:
                vehiculo = data.get('vehiculo')
                if vehiculo is None:
                    vehiculo = getattr(self.instance, 'vehiculo', None)
                if not vehiculo:
                    raise serializers.ValidationError({
                        'vehiculo': 'Debes seleccionar el vehículo al que se le carga el combustible.'
                    })

        return data

    def create(self, validated_data):
        producto = validated_data['producto']
        cantidad = validated_data['cantidad']

        stock_anterior = producto.stock_actual
        stock_resultante = stock_anterior - cantidad

        if 'responsable' not in validated_data:
            validated_data['responsable'] = self.context['request'].user

        # Copia legible del vehículo a la columna legacy vehiculo_codigo para que los
        # reportes y vistas históricas sigan mostrando algo entendible. Si el cliente ya
        # mandó vehiculo_codigo, respetamos lo que dijo.
        vehiculo = validated_data.get('vehiculo')
        if vehiculo and not validated_data.get('vehiculo_codigo'):
            validated_data['vehiculo_codigo'] = vehiculo.equipo or vehiculo.nombre

        producto.stock_actual = stock_resultante
        producto.save(update_fields=['stock_actual', 'updated_at'])

        # El producto se actualiza antes de crear el movimiento porque la señal
        # post_save (alerta de stock mínimo) lee producto.stock_actual desde la BD.
        return MovimientoInventario.objects.create(
            stock_anterior=stock_anterior, stock_resultante=stock_resultante, **validated_data,
        )


class CancelarMovimientoSerializer(serializers.Serializer):
    """Yajaira (o Superadmin) cancela una salida capturada mal — nunca Campo. Revierte el
    stock al valor previo al movimiento; no hay paso de 'aprobar' porque el stock ya se
    aplicó de inmediato al registrar la salida."""

    nota = serializers.CharField()

    def validate_nota(self, value):
        if not value.strip():
            raise serializers.ValidationError('Indica el motivo de la cancelación.')
        return value

    def validate(self, data):
        movimiento = self.instance
        if movimiento.tipo != MovimientoInventario.Tipo.SALIDA:
            raise serializers.ValidationError('Solo se pueden cancelar salidas.')
        if movimiento.rechazado:
            raise serializers.ValidationError('Esta salida ya fue cancelada.')
        return data

    def save(self):
        movimiento = self.instance
        request = self.context['request']
        nota = self.validated_data['nota']

        movimiento.rechazado = True
        movimiento.validado_por = request.user
        movimiento.notas = f'{movimiento.notas}\n\nCancelado: {nota}'.strip()

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


class CompraSerializer(serializers.ModelSerializer):
    comprado_por = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True))
    comprado_por_detalle = UsuarioResumenSerializer(source='comprado_por', read_only=True)
    registrado_por_detalle = UsuarioResumenSerializer(source='registrado_por', read_only=True)
    solicitud_folio = serializers.SerializerMethodField()
    producto_descripcion = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = (
            'id', 'solicitud', 'solicitud_folio', 'movimiento', 'producto_descripcion', 'proveedor',
            'comprado_por', 'comprado_por_detalle', 'registrado_por', 'registrado_por_detalle',
            'monto_total', 'foto_factura', 'notas', 'fecha_compra', 'created_at',
        )
        read_only_fields = ('id', 'solicitud', 'movimiento', 'registrado_por', 'created_at')

    def get_solicitud_folio(self, obj):
        return obj.solicitud.folio if obj.solicitud_id else None

    def get_producto_descripcion(self, obj):
        return obj.movimiento.producto.descripcion if obj.movimiento_id else None


class SolicitudMaterialSerializer(serializers.ModelSerializer):
    items = ItemSolicitudSerializer(many=True)
    solicitante_detalle = UsuarioResumenSerializer(source='solicitante', read_only=True)
    created_by_detalle = UsuarioResumenSerializer(source='created_by', read_only=True)
    autorizado_por_detalle = UsuarioResumenSerializer(source='autorizado_por', read_only=True)
    area_display = serializers.CharField(source='get_area_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    compra = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudMaterial
        fields = (
            'id', 'folio', 'solicitante', 'solicitante_detalle', 'area', 'area_display',
            'descripcion_necesidad', 'estado', 'estado_display', 'autorizado_por', 'autorizado_por_detalle',
            'autorizado_en', 'notas_autorizacion', 'created_by', 'created_by_detalle',
            'created_at', 'updated_at', 'items', 'compra',
        )
        read_only_fields = (
            'id', 'folio', 'solicitante', 'autorizado_por', 'autorizado_en', 'notas_autorizacion',
            'created_by', 'created_at', 'updated_at',
        )

    def get_compra(self, obj):
        compra = getattr(obj, 'compra', None)
        return CompraSerializer(compra).data if compra else None

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
        if validated_data.get('estado') == SolicitudMaterial.Estado.ENVIADA:
            # Las solicitudes de material ya no requieren autorización manual: la coordinación
            # (qué material, para qué proyecto) es comunicación directa entre solicitante y
            # quien captura, así que queda lista para compra de inmediato. La autorización
            # manual (autorizar/rechazar) queda reservada para cotizaciones de proyectos.
            validated_data['estado'] = SolicitudMaterial.Estado.AUTORIZADA
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
    entrada_confirmada_por_detalle = UsuarioResumenSerializer(source='entrada_confirmada_por', read_only=True)

    class Meta:
        model = RecepcionMaterial
        fields = (
            'id', 'envio', 'recibido_por', 'recibido_por_detalle', 'fecha_recepcion', 'hora_recepcion',
            'estado_general', 'estado_general_display', 'notas', 'audio',
            'entrada_confirmada', 'entrada_confirmada_por', 'entrada_confirmada_por_detalle',
            'entrada_confirmada_en', 'created_at', 'items',
        )
        read_only_fields = (
            'id', 'envio', 'recibido_por', 'entrada_confirmada', 'entrada_confirmada_por',
            'entrada_confirmada_en', 'created_at',
        )


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


class RelacionComprasSerializer(serializers.ModelSerializer):
    generado_por_detalle = UsuarioResumenSerializer(source='generado_por', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    compras = CompraSerializer(many=True, read_only=True)
    monto_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = RelacionCompras
        fields = (
            'id', 'folio', 'fecha_inicio', 'fecha_fin', 'compras', 'monto_total', 'generado_por',
            'generado_por_detalle', 'estado', 'estado_display', 'enviada_en', 'notas', 'created_at',
        )
        read_only_fields = (
            'id', 'folio', 'compras', 'monto_total', 'generado_por', 'estado', 'enviada_en', 'created_at',
        )
