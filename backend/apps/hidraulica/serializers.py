from rest_framework import serializers

from .models import RegistroHidraulico


class RegistroHidraulicoSerializer(serializers.ModelSerializer):
    nombre_punto_display = serializers.CharField(source='get_punto_medicion_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()
    validado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RegistroHidraulico
        fields = (
            'id',
            'punto_medicion',
            'nombre_punto_display',
            'estado',
            'estado_display',
            'nivel_pulgadas',
            'caudal_m3h',
            'presion_psi',
            'lluvia_mm',
            'observaciones',
            'foto',
            'fecha_hora',
            'validado',
            'validado_por',
            'validado_por_nombre',
            'created_by',
            'created_by_nombre',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'validado', 'validado_por', 'created_by', 'created_at', 'updated_at')

    def get_created_by_nombre(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_validado_por_nombre(self, obj):
        if obj.validado_por:
            return obj.validado_por.get_full_name() or obj.validado_por.username
        return None


class ValidarRegistroHidraulicoSerializer(serializers.ModelSerializer):
    validado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RegistroHidraulico
        fields = ('id', 'validado', 'validado_por', 'validado_por_nombre')
        read_only_fields = ('id', 'validado_por')

    def get_validado_por_nombre(self, obj):
        if obj.validado_por:
            return obj.validado_por.get_full_name() or obj.validado_por.username
        return None
