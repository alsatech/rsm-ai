from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.inventario.models import Producto

from .models import (
    AvanceProyecto,
    CompraProyecto,
    Contratista,
    CotizacionManoObra,
    DevolucionInventario,
    FotoAvance,
    FotoCompra,
    ItemProyecto,
    MovimientoProyecto,
    Proyecto,
    MONTO_REQUIERE_AUTORIZACION,
)

User = get_user_model()


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class ContratistaSerializer(serializers.ModelSerializer):
    created_by_detalle = UsuarioResumenSerializer(source='created_by', read_only=True)

    class Meta:
        model = Contratista
        fields = (
            'id', 'nombre', 'empresa', 'especialidad', 'telefono', 'email', 'rfc', 'notas',
            'activo', 'created_by', 'created_by_detalle', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ProyectoSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    autorizado_por_detalle = UsuarioResumenSerializer(source='autorizado_por', read_only=True)
    creado_por_detalle = UsuarioResumenSerializer(source='creado_por', read_only=True)
    asignado_a_detalle = UsuarioResumenSerializer(source='asignado_a', read_only=True)
    ultimo_avance = serializers.SerializerMethodField()

    class Meta:
        model = Proyecto
        fields = (
            'id', 'folio', 'nombre', 'descripcion', 'estado', 'estado_display', 'presupuesto_total',
            'requiere_autorizacion', 'autorizado_por', 'autorizado_por_detalle', 'autorizado_en',
            'notas_autorizacion', 'fecha_inicio_estimada', 'fecha_inicio_real', 'fecha_fin_estimada',
            'fecha_fin_real', 'observaciones', 'creado_por', 'creado_por_detalle', 'asignado_a',
            'asignado_a_detalle', 'ultimo_avance', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'folio', 'requiere_autorizacion', 'autorizado_por', 'autorizado_en',
            'notas_autorizacion', 'creado_por', 'created_at', 'updated_at',
        )

    def get_ultimo_avance(self, obj):
        ultimo = obj.avances.order_by('-fecha_avance', '-created_at').first()
        return ultimo.porcentaje if ultimo else 0

    def create(self, validated_data):
        validated_data['creado_por'] = self.context['request'].user
        return super().create(validated_data)


class AutorizarProyectoSerializer(serializers.Serializer):
    notas_autorizacion = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        proyecto = self.instance
        request = self.context['request']
        proyecto.estado = Proyecto.Estado.AUTORIZADO
        proyecto.autorizado_por = request.user
        proyecto.autorizado_en = timezone.now()
        proyecto.notas_autorizacion = self.validated_data.get('notas_autorizacion', '')
        proyecto.save()
        return proyecto


class RechazarProyectoSerializer(serializers.Serializer):
    notas_autorizacion = serializers.CharField()

    def validate_notas_autorizacion(self, value):
        if not value.strip():
            raise serializers.ValidationError('Debes indicar el motivo del rechazo.')
        return value

    def save(self):
        proyecto = self.instance
        request = self.context['request']
        proyecto.estado = Proyecto.Estado.CANCELADO
        proyecto.autorizado_por = request.user
        proyecto.autorizado_en = timezone.now()
        proyecto.notas_autorizacion = self.validated_data['notas_autorizacion']
        proyecto.save()
        return proyecto


class CotizacionManoObraSerializer(serializers.ModelSerializer):
    contratista_detalle = ContratistaSerializer(source='contratista', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    aprobada_por_detalle = UsuarioResumenSerializer(source='aprobada_por', read_only=True)
    created_by_detalle = UsuarioResumenSerializer(source='created_by', read_only=True)

    class Meta:
        model = CotizacionManoObra
        fields = (
            'id', 'proyecto', 'contratista', 'contratista_detalle', 'descripcion_trabajo', 'monto',
            'estado', 'estado_display', 'aprobada_por', 'aprobada_por_detalle', 'aprobada_en', 'notas',
            'archivo_cotizacion', 'created_by', 'created_by_detalle', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'proyecto', 'estado', 'aprobada_por', 'aprobada_en', 'created_by', 'created_at', 'updated_at',
        )

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AprobarCotizacionSerializer(serializers.Serializer):
    ACCION_CHOICES = ('aprobar', 'rechazar')

    accion = serializers.ChoiceField(choices=ACCION_CHOICES)
    notas = serializers.CharField(required=False, allow_blank=True)

    def save(self):
        cotizacion = self.instance
        request = self.context['request']
        accion = self.validated_data['accion']
        notas = self.validated_data.get('notas', '')

        cotizacion.estado = (
            CotizacionManoObra.Estado.APROBADA if accion == 'aprobar' else CotizacionManoObra.Estado.RECHAZADA
        )
        cotizacion.aprobada_por = request.user
        cotizacion.aprobada_en = timezone.now()
        if notas:
            cotizacion.notas = notas
        cotizacion.save()
        return cotizacion


class ItemProyectoSerializer(serializers.ModelSerializer):
    producto_ref_detalle = serializers.SerializerMethodField()

    class Meta:
        model = ItemProyecto
        fields = (
            'id', 'proyecto', 'producto_ref', 'producto_ref_detalle', 'codigo_proyecto', 'descripcion',
            'unidad', 'stock_actual', 'stock_inicial', 'costo_unitario', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'proyecto', 'codigo_proyecto', 'stock_actual', 'created_at', 'updated_at')

    def get_producto_ref_detalle(self, obj):
        if not obj.producto_ref_id:
            return None
        return {'id': obj.producto_ref_id, 'codigo': obj.producto_ref.codigo, 'descripcion': obj.producto_ref.descripcion}

    def validate_stock_inicial(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock inicial no puede ser negativo.')
        return value

    def create(self, validated_data):
        validated_data['stock_actual'] = validated_data.get('stock_inicial', 0)
        return super().create(validated_data)


class MovimientoProyectoSerializer(serializers.ModelSerializer):
    responsable_detalle = UsuarioResumenSerializer(source='responsable', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = MovimientoProyecto
        fields = (
            'id', 'item', 'tipo', 'tipo_display', 'cantidad', 'stock_anterior', 'stock_resultante',
            'responsable', 'responsable_detalle', 'descripcion_uso', 'compra_ref', 'fecha_movimiento', 'created_at',
        )
        read_only_fields = fields


class RegistrarMovimientoItemSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=(MovimientoProyecto.Tipo.ENTRADA, MovimientoProyecto.Tipo.SALIDA))
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2)
    descripcion_uso = serializers.CharField(required=False, allow_blank=True)

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a cero.')
        return value

    def validate(self, data):
        item = self.context['item']
        if data['tipo'] == MovimientoProyecto.Tipo.SALIDA and data['cantidad'] > item.stock_actual:
            raise serializers.ValidationError({
                'cantidad': f'No hay suficiente stock en el proyecto. Stock actual: {item.stock_actual} {item.unidad}.'
            })
        return data

    def save(self):
        item = self.context['item']
        request = self.context['request']
        tipo = self.validated_data['tipo']
        cantidad = self.validated_data['cantidad']

        stock_anterior = item.stock_actual
        stock_resultante = stock_anterior + cantidad if tipo == MovimientoProyecto.Tipo.ENTRADA else stock_anterior - cantidad
        item.stock_actual = stock_resultante
        item.save(update_fields=['stock_actual', 'updated_at'])

        return MovimientoProyecto.objects.create(
            item=item,
            tipo=tipo,
            cantidad=cantidad,
            stock_anterior=stock_anterior,
            stock_resultante=stock_resultante,
            responsable=request.user,
            descripcion_uso=self.validated_data.get('descripcion_uso', ''),
        )


class DevolucionInventarioSerializer(serializers.Serializer):
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2)
    producto_inventario = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), required=False)
    notas = serializers.CharField(required=False, allow_blank=True)

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a cero.')
        return value

    def validate(self, data):
        item = self.context['item']
        if data['cantidad'] > item.stock_actual:
            raise serializers.ValidationError({
                'cantidad': f'No hay suficiente stock en el proyecto. Stock actual: {item.stock_actual} {item.unidad}.'
            })
        if not data.get('producto_inventario') and not item.producto_ref_id:
            raise serializers.ValidationError({
                'producto_inventario': 'Este material no viene del catálogo general — indica a qué producto del inventario se devuelve.'
            })
        return data

    def save(self):
        item = self.context['item']
        request = self.context['request']
        producto_inventario = self.validated_data.get('producto_inventario') or item.producto_ref

        return DevolucionInventario.objects.create(
            proyecto=item.proyecto,
            item=item,
            cantidad=self.validated_data['cantidad'],
            producto_inventario=producto_inventario,
            registrado_por=request.user,
            notas=self.validated_data.get('notas', ''),
        )


class FotoCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoCompra
        fields = ('id', 'foto', 'descripcion', 'uploaded_by', 'created_at')
        read_only_fields = ('id', 'uploaded_by', 'created_at')


class CompraProyectoSerializer(serializers.ModelSerializer):
    contratista_proveedor_detalle = ContratistaSerializer(source='contratista_proveedor', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    autorizado_por_detalle = UsuarioResumenSerializer(source='autorizado_por', read_only=True)
    created_by_detalle = UsuarioResumenSerializer(source='created_by', read_only=True)
    fotos = FotoCompraSerializer(many=True, read_only=True)

    class Meta:
        model = CompraProyecto
        fields = (
            'id', 'proyecto', 'folio_compra', 'contratista_proveedor', 'contratista_proveedor_detalle',
            'proveedor_nombre', 'descripcion', 'monto_total', 'requiere_autorizacion', 'autorizado_por',
            'autorizado_por_detalle', 'autorizado_en', 'estado', 'estado_display', 'fecha_compra', 'notas',
            'created_by', 'created_by_detalle', 'created_at', 'updated_at', 'fotos',
        )
        read_only_fields = (
            'id', 'proyecto', 'folio_compra', 'requiere_autorizacion', 'autorizado_por', 'autorizado_en',
            'estado', 'created_by', 'created_at', 'updated_at',
        )

    def create(self, validated_data):
        request = self.context['request']
        monto = validated_data['monto_total']
        requiere_autorizacion = monto > MONTO_REQUIERE_AUTORIZACION
        validated_data['requiere_autorizacion'] = requiere_autorizacion
        validated_data['estado'] = (
            CompraProyecto.Estado.PENDIENTE_AUTORIZACION if requiere_autorizacion else CompraProyecto.Estado.AUTORIZADA
        )
        validated_data['created_by'] = request.user
        return super().create(validated_data)


class AutorizarCompraSerializer(serializers.Serializer):
    ACCION_CHOICES = ('autorizar', 'rechazar')

    accion = serializers.ChoiceField(choices=ACCION_CHOICES)

    def save(self):
        compra = self.instance
        request = self.context['request']
        accion = self.validated_data['accion']

        compra.estado = CompraProyecto.Estado.AUTORIZADA if accion == 'autorizar' else CompraProyecto.Estado.RECHAZADA
        compra.autorizado_por = request.user
        compra.autorizado_en = timezone.now()
        compra.save()
        return compra


class FotoAvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoAvance
        fields = ('id', 'foto', 'descripcion', 'uploaded_by', 'created_at')
        read_only_fields = ('id', 'uploaded_by', 'created_at')


class AvanceProyectoSerializer(serializers.ModelSerializer):
    registrado_por_detalle = UsuarioResumenSerializer(source='registrado_por', read_only=True)
    fotos = FotoAvanceSerializer(many=True, read_only=True)

    class Meta:
        model = AvanceProyecto
        fields = (
            'id', 'proyecto', 'porcentaje', 'descripcion', 'registrado_por', 'registrado_por_detalle',
            'fecha_avance', 'created_at', 'fotos',
        )
        read_only_fields = ('id', 'proyecto', 'registrado_por', 'created_at')

    def validate_porcentaje(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('El porcentaje debe estar entre 0 y 100.')
        return value

    def create(self, validated_data):
        validated_data['registrado_por'] = self.context['request'].user
        return super().create(validated_data)
