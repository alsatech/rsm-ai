from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import CategoriaInventario, MovimientoInventario, Producto, Ubicacion
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
