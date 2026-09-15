from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Factura, RelacionMensual

User = get_user_model()


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class FacturaSerializer(serializers.ModelSerializer):
    modulo_origen_display = serializers.CharField(source='get_modulo_origen_display', read_only=True)
    registrado_por_detalle = UsuarioResumenSerializer(source='registrado_por', read_only=True)

    class Meta:
        model = Factura
        fields = (
            'id', 'folio_interno', 'numero_factura', 'fecha', 'concepto', 'importe', 'archivo',
            'modulo_origen', 'modulo_origen_display', 'referencia_id', 'referencia_descripcion',
            'mes_reporte', 'notas', 'registrado_por', 'registrado_por_detalle', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'folio_interno', 'mes_reporte', 'registrado_por', 'created_at', 'updated_at')

    def validate_importe(self, value):
        if value <= 0:
            raise serializers.ValidationError('El importe debe ser mayor a cero.')
        return value

    def create(self, validated_data):
        validated_data['registrado_por'] = self.context['request'].user
        return super().create(validated_data)


class RelacionMensualSerializer(serializers.ModelSerializer):
    generado_por_detalle = UsuarioResumenSerializer(source='generado_por', read_only=True)

    class Meta:
        model = RelacionMensual
        fields = (
            'id', 'mes', 'generado_por', 'generado_por_detalle', 'total', 'numero_facturas',
            'archivo_excel', 'notas', 'created_at',
        )
        read_only_fields = fields


class GenerarRelacionSerializer(serializers.Serializer):
    mes = serializers.RegexField(regex=r'^\d{4}-(0[1-9]|1[0-2])$', error_messages={
        'invalid': 'El mes debe tener formato YYYY-MM, ej. "2026-05".',
    })


class ImportarFacturasSerializer(serializers.Serializer):
    MODULO_CHOICES = ('inventario', 'proyectos')

    modulo = serializers.ChoiceField(choices=MODULO_CHOICES)
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
