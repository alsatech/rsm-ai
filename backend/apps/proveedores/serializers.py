from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Proveedor

User = get_user_model()


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class ProveedorSerializer(serializers.ModelSerializer):
    created_by_detalle = UsuarioResumenSerializer(source='created_by', read_only=True)

    class Meta:
        model = Proveedor
        fields = (
            'id', 'tipo', 'persona', 'nombre', 'empresa', 'especialidad', 'rfc',
            'ciudad', 'pais', 'moneda', 'tipo_cambio_referencia', 'trabajo_antes',
            'detalle_trabajo_previo', 'telefono', 'email', 'banco', 'cuenta_bancaria',
            'clabe', 'notas', 'activo', 'created_by', 'created_by_detalle',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')
