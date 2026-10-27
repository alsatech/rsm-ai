from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Minuta

User = get_user_model()


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class MinutaSerializer(serializers.ModelSerializer):
    generada_por_detalle = UsuarioResumenSerializer(source='generada_por', read_only=True)

    class Meta:
        model = Minuta
        fields = ('id', 'fecha', 'generada_por', 'generada_por_detalle', 'notas', 'created_at', 'updated_at')
        read_only_fields = ('id', 'generada_por', 'created_at', 'updated_at')


class GenerarMinutaSerializer(serializers.Serializer):
    notas = serializers.CharField(required=False, allow_blank=True, default='')
