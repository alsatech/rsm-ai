from rest_framework import serializers

from .models import AlertaMantenimientoGenerador, ChecklistGenerador, Generador, RegistroHidraulico


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


class AlertaMantenimientoGeneradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertaMantenimientoGenerador
        fields = ('id', 'tipo_servicio', 'horas_intervalo', 'meses_intervalo', 'ultima_alerta', 'activa')


class GeneradorSerializer(serializers.ModelSerializer):
    nombre_display = serializers.CharField(source='get_nombre_display', read_only=True)
    updated_by_nombre = serializers.SerializerMethodField()
    alertas_pendientes = serializers.SerializerMethodField()

    class Meta:
        model = Generador
        fields = (
            'id',
            'nombre',
            'nombre_display',
            'marca_modelo',
            'horas_operacion',
            'ultima_actualizacion',
            'updated_by',
            'updated_by_nombre',
            'alertas_pendientes',
        )
        read_only_fields = ('id', 'nombre', 'marca_modelo', 'ultima_actualizacion', 'updated_by')

    def get_updated_by_nombre(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return None

    def get_alertas_pendientes(self, obj):
        pendientes = [
            alerta
            for alerta in obj.alertas_mantenimiento.all()
            if alerta.activa and alerta.horas_intervalo is not None and obj.horas_operacion >= alerta.horas_intervalo
        ]
        return AlertaMantenimientoGeneradorSerializer(pendientes, many=True).data


class ChecklistGeneradorSerializer(serializers.ModelSerializer):
    generador_nombre = serializers.CharField(source='generador.get_nombre_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistGenerador
        fields = (
            'id',
            'generador',
            'generador_nombre',
            'fecha_hora',
            'nivel_aceite',
            'nivel_refrigerante',
            'filtro_aire',
            'sin_fugas',
            'observaciones',
            'created_by',
            'created_by_nombre',
            'created_at',
        )
        read_only_fields = ('id', 'generador', 'created_by', 'created_at')

    def get_created_by_nombre(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username


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
