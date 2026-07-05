from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Corraleta, FotoRecorrido, ParadaRecorrido, RecorridoGanado

User = get_user_model()

MAX_FOTOS = 4


class CorraletaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Corraleta
        fields = ('id', 'nombre', 'lat', 'lng', 'activa')


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class ParadaRecorridoSerializer(serializers.ModelSerializer):
    corraleta_detalle = CorraletaSerializer(source='corraleta', read_only=True)

    class Meta:
        model = ParadaRecorrido
        fields = (
            'id', 'corraleta', 'corraleta_detalle',
            'nombre_libre', 'lat', 'lng', 'orden', 'hora_llegada',
        )
        read_only_fields = ('id',)

    def validate(self, data):
        if not data.get('corraleta') and not data.get('nombre_libre'):
            raise serializers.ValidationError(
                'La parada debe tener corraleta o nombre de lugar.'
            )
        return data


class FotoRecorridoSerializer(serializers.ModelSerializer):
    uploaded_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = FotoRecorrido
        fields = ('id', 'foto', 'descripcion', 'uploaded_by', 'uploaded_by_nombre', 'created_at')
        read_only_fields = ('id', 'uploaded_by', 'created_at')

    def get_uploaded_by_nombre(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def validate(self, data):
        recorrido = self.context.get('recorrido')
        if recorrido and recorrido.fotos.count() >= MAX_FOTOS:
            raise serializers.ValidationError(
                'Este recorrido ya tiene el máximo de 4 fotos permitidas.'
            )
        return data


class RecorridoGanadoSerializer(serializers.ModelSerializer):
    responsable_detalle = UsuarioResumenSerializer(source='responsable', read_only=True)
    asistentes_detalle = UsuarioResumenSerializer(source='asistentes', many=True, read_only=True)
    paradas = ParadaRecorridoSerializer(many=True, read_only=True)
    fotos = FotoRecorridoSerializer(many=True, read_only=True)
    estado_hato_display = serializers.CharField(source='get_estado_hato_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    color_display = serializers.CharField(source='get_color_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RecorridoGanado
        fields = (
            'id',
            'fecha',
            'tipo',
            'plan_referencia',
            'estado',
            'estado_display',
            'responsable',
            'responsable_detalle',
            'asistentes',
            'asistentes_detalle',
            'numero_cabezas',
            'estado_hato',
            'estado_hato_display',
            'color',
            'color_display',
            'narrativa',
            'observaciones',
            'paradas',
            'fotos',
            'hora_inicio',
            'hora_fin',
            'created_by',
            'created_by_nombre',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id', 'tipo', 'plan_referencia', 'estado', 'hora_inicio', 'hora_fin',
            'created_by', 'created_at', 'updated_at',
        )

    def get_created_by_nombre(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username


class RecorridoGanadoCreateSerializer(serializers.ModelSerializer):
    """Serializer para el flujo antiguo: crear recorrido completo de una sola vez."""
    paradas = ParadaRecorridoSerializer(many=True)
    responsable = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )

    class Meta:
        model = RecorridoGanado
        fields = (
            'id',
            'fecha',
            'responsable',
            'asistentes',
            'numero_cabezas',
            'estado_hato',
            'color',
            'narrativa',
            'observaciones',
            'paradas',
        )
        read_only_fields = ('id',)

    def validate_estado_hato(self, value):
        if not value:
            raise serializers.ValidationError('Selecciona el estado del hato.')
        return value

    def validate_narrativa(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('La narrativa es requerida.')
        return value

    def validate_paradas(self, value):
        if len(value) < 2:
            raise serializers.ValidationError(
                'El recorrido debe tener al menos 2 paradas.'
            )
        return value

    def create(self, validated_data):
        paradas_data = validated_data.pop('paradas', [])
        asistentes = validated_data.pop('asistentes', [])
        recorrido = RecorridoGanado.objects.create(**validated_data)
        recorrido.asistentes.set(asistentes)
        for parada_data in paradas_data:
            ParadaRecorrido.objects.create(recorrido=recorrido, **parada_data)
        return recorrido

    def update(self, instance, validated_data):
        paradas_data = validated_data.pop('paradas', None)
        asistentes = validated_data.pop('asistentes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if asistentes is not None:
            instance.asistentes.set(asistentes)
        if paradas_data is not None:
            instance.paradas.all().delete()
            for parada_data in paradas_data:
                ParadaRecorrido.objects.create(recorrido=instance, **parada_data)
        return instance


class IniciarRecorridoSerializer(serializers.ModelSerializer):
    """Inicia un recorrido en estado en_curso (sin estado_hato ni narrativa todavía)."""
    responsable = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )

    class Meta:
        model = RecorridoGanado
        fields = ('id', 'fecha', 'responsable', 'asistentes', 'color', 'estado')
        read_only_fields = ('id', 'estado')

    def create(self, validated_data):
        asistentes = validated_data.pop('asistentes', [])
        recorrido = RecorridoGanado.objects.create(**validated_data)
        recorrido.asistentes.set(asistentes)
        return recorrido


class AgregarParadaSerializer(serializers.ModelSerializer):
    """Agrega una sola parada a un recorrido en_curso."""

    class Meta:
        model = ParadaRecorrido
        fields = ('id', 'corraleta', 'nombre_libre', 'lat', 'lng')
        read_only_fields = ('id',)

    def validate(self, data):
        if not data.get('corraleta') and not data.get('nombre_libre'):
            raise serializers.ValidationError(
                'Indica una corraleta del catálogo o escribe el nombre del lugar.'
            )
        return data


class FinalizarRecorridoSerializer(serializers.ModelSerializer):
    """Cierra el recorrido con los datos del hato y la narrativa."""
    estado_hato = serializers.ChoiceField(choices=RecorridoGanado.EstadoHato.choices)
    narrativa = serializers.CharField(min_length=1)

    class Meta:
        model = RecorridoGanado
        fields = ('numero_cabezas', 'estado_hato', 'narrativa', 'observaciones', 'color')


class SyncParadaItemSerializer(serializers.Serializer):
    """Una parada capturada offline, lista para subir en bloque."""
    orden = serializers.IntegerField()
    corraleta_id = serializers.PrimaryKeyRelatedField(
        source='corraleta', queryset=Corraleta.objects.all(), required=False, allow_null=True,
    )
    nombre_libre = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    lat = serializers.DecimalField(max_digits=18, decimal_places=12, required=False, allow_null=True)
    lng = serializers.DecimalField(max_digits=18, decimal_places=12, required=False, allow_null=True)
    timestamp = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, data):
        if not data.get('corraleta') and not data.get('nombre_libre'):
            raise serializers.ValidationError(
                'Cada parada debe tener corraleta_id o nombre_libre.'
            )
        return data


class SyncParadasSerializer(serializers.Serializer):
    paradas = SyncParadaItemSerializer(many=True)


class PlanRecorridoSerializer(serializers.ModelSerializer):
    """Representa un recorrido tipo=planeado, incluyendo si ya tiene un recorrido real vinculado."""
    paradas = ParadaRecorridoSerializer(many=True, read_only=True)
    recorrido_vinculado_id = serializers.SerializerMethodField()

    class Meta:
        model = RecorridoGanado
        fields = ('id', 'fecha', 'narrativa', 'paradas', 'recorrido_vinculado_id', 'created_at')
        read_only_fields = fields

    def get_recorrido_vinculado_id(self, obj):
        real = obj.recorridos_reales.first()
        return real.id if real else None


class PlanParadaItemSerializer(serializers.Serializer):
    corraleta_id = serializers.PrimaryKeyRelatedField(
        source='corraleta', queryset=Corraleta.objects.all(),
    )
    orden = serializers.IntegerField()


class CrearPlanSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    narrativa_plan = serializers.CharField(required=False, allow_blank=True, default='')
    paradas = PlanParadaItemSerializer(many=True)

    def validate_paradas(self, value):
        if not value:
            raise serializers.ValidationError('El plan debe tener al menos una parada.')
        return value


class EditarPlanSerializer(serializers.Serializer):
    narrativa_plan = serializers.CharField(required=False, allow_blank=True, default='')
    paradas = PlanParadaItemSerializer(many=True)

    def validate_paradas(self, value):
        if not value:
            raise serializers.ValidationError('El plan debe tener al menos una parada.')
        return value
