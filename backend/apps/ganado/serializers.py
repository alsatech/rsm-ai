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
        fields = ('id', 'corraleta', 'corraleta_detalle', 'orden', 'hora_llegada')
        read_only_fields = ('id',)


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
    color_display = serializers.CharField(source='get_color_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RecorridoGanado
        fields = (
            'id',
            'fecha',
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
            'created_by',
            'created_by_nombre',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def get_created_by_nombre(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username


class RecorridoGanadoCreateSerializer(serializers.ModelSerializer):
    paradas = ParadaRecorridoSerializer(many=True)

    class Meta:
        model = RecorridoGanado
        fields = (
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
