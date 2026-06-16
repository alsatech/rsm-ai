from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import FotoPendiente, HistorialPendiente, Pendiente

User = get_user_model()

MAX_FOTOS = 4


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class FotoPendienteSerializer(serializers.ModelSerializer):
    uploaded_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = FotoPendiente
        fields = (
            'id',
            'foto',
            'momento',
            'descripcion',
            'uploaded_by',
            'uploaded_by_nombre',
            'created_at',
        )
        read_only_fields = ('id', 'uploaded_by', 'created_at')

    def get_uploaded_by_nombre(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def validate(self, data):
        pendiente = self.context.get('pendiente')
        if pendiente and pendiente.fotos.count() >= MAX_FOTOS:
            raise serializers.ValidationError(
                'Este pendiente ya tiene el máximo de 4 fotos permitidas.'
            )
        return data


class HistorialPendienteSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = HistorialPendiente
        fields = (
            'id',
            'cambio',
            'estado_anterior',
            'estado_nuevo',
            'nota',
            'usuario',
            'usuario_nombre',
            'fecha',
        )
        read_only_fields = ('id', 'fecha')

    def get_usuario_nombre(self, obj):
        return obj.usuario.get_full_name() or obj.usuario.username


class PendienteSerializer(serializers.ModelSerializer):
    created_by_nombre = serializers.SerializerMethodField()
    cerrado_por_nombre = serializers.SerializerMethodField()
    asignado_a_detalle = UsuarioResumenSerializer(source='asignado_a', many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    origen_display = serializers.CharField(source='get_origen_display', read_only=True)
    modulo_display = serializers.CharField(source='get_modulo_relacionado_display', read_only=True)
    motivo_bloqueo_display = serializers.SerializerMethodField()
    dias_abierto = serializers.SerializerMethodField()
    fotos = FotoPendienteSerializer(many=True, read_only=True)

    class Meta:
        model = Pendiente
        fields = (
            'id',
            'titulo',
            'descripcion',
            'estado',
            'estado_display',
            'prioridad',
            'prioridad_display',
            'motivo_bloqueo',
            'motivo_bloqueo_display',
            'origen',
            'origen_display',
            'modulo_relacionado',
            'modulo_display',
            'registro_relacionado_id',
            'asignado_a',
            'asignado_a_detalle',
            'fecha_limite',
            'fecha_cierre',
            'cerrado_por',
            'cerrado_por_nombre',
            'created_by',
            'created_by_nombre',
            'created_at',
            'updated_at',
            'dias_abierto',
            'fotos',
        )
        read_only_fields = (
            'id',
            'estado',
            'fecha_cierre',
            'cerrado_por',
            'created_by',
            'created_at',
            'updated_at',
        )

    def get_created_by_nombre(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_cerrado_por_nombre(self, obj):
        if obj.cerrado_por:
            return obj.cerrado_por.get_full_name() or obj.cerrado_por.username
        return None

    def get_motivo_bloqueo_display(self, obj):
        if obj.motivo_bloqueo:
            return obj.get_motivo_bloqueo_display()
        return None

    def get_dias_abierto(self, obj):
        return obj.dias_abierto()


class CambiarEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Pendiente.Estado.choices)
    motivo_bloqueo = serializers.ChoiceField(
        choices=Pendiente.MotivoBloqueo.choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    nota = serializers.CharField(required=False, allow_blank=True)
