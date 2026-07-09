from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import AlertaFlota, ChecklistVehiculo, FotoChecklist, Vehiculo

User = get_user_model()

MAX_FOTOS = 6


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'nombre', 'rol')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class VehiculoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    ultimo_checklist = serializers.SerializerMethodField()
    alertas_activas_count = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = (
            'id', 'equipo', 'nombre', 'tipo', 'tipo_display', 'marca', 'modelo', 'anio', 'color',
            'placas', 'numero_serie', 'kilometraje_actual', 'uso_asignacion',
            'estado', 'estado_display', 'fecha_vencimiento_tenencia', 'fecha_vencimiento_placas',
            'foto', 'notas', 'ultimo_checklist', 'alertas_activas_count',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_ultimo_checklist(self, obj):
        ultimo = obj.checklists.select_related('responsable').first()
        if not ultimo:
            return None
        return {
            'id': ultimo.id,
            'tipo_reporte': ultimo.tipo_reporte,
            'fecha_hora': ultimo.fecha_hora,
            'responsable': ultimo.responsable.get_full_name() or ultimo.responsable.username,
            'validado': ultimo.validado,
        }

    def get_alertas_activas_count(self, obj):
        alertas = getattr(obj, 'alertas_activas_prefetch', None)
        if alertas is not None:
            return len(alertas)
        return obj.alertas.filter(activa=True, resuelta=False).count()


class FotoChecklistSerializer(serializers.ModelSerializer):
    uploaded_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = FotoChecklist
        fields = ('id', 'foto', 'descripcion', 'uploaded_by', 'uploaded_by_nombre', 'created_at')
        read_only_fields = ('id', 'uploaded_by', 'created_at')

    def get_uploaded_by_nombre(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def validate(self, data):
        checklist = self.context.get('checklist')
        if checklist and checklist.fotos.count() >= MAX_FOTOS:
            raise serializers.ValidationError(
                'Este checklist ya tiene el máximo de 6 fotos permitidas.'
            )
        return data


class ChecklistVehiculoSerializer(serializers.ModelSerializer):
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)
    responsable = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    responsable_detalle = UsuarioResumenSerializer(source='responsable', read_only=True)
    validado_por_detalle = UsuarioResumenSerializer(source='validado_por', read_only=True)
    tipo_reporte_display = serializers.CharField(source='get_tipo_reporte_display', read_only=True)
    fotos = FotoChecklistSerializer(many=True, read_only=True)
    items_verificados = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistVehiculo
        fields = (
            'id', 'vehiculo', 'vehiculo_detalle', 'tipo_reporte', 'tipo_reporte_display',
            'responsable', 'responsable_detalle', 'fecha_hora', 'km_reporte',
            'carroceria_pintura', 'parabrisas_vidrios', 'neumaticos_presion',
            'luces_delanteras_traseras', 'interiores_asientos', 'nivel_combustible',
            'nivel_aceite', 'nivel_refrigerante', 'nivel_liquido_frenos',
            'frenos_respuesta', 'direccion_volante', 'suspension_amortiguadores', 'filtro_aire',
            'gato', 'cruzeta', 'llanta_refaccion', 'caja_herramientas', 'cables_corriente',
            'observaciones', 'validado', 'validado_por', 'validado_por_detalle', 'validado_en',
            'fotos', 'items_verificados', 'total_items', 'created_at',
        )
        read_only_fields = (
            'id', 'validado', 'validado_por', 'validado_en', 'created_at',
        )

    def get_items_verificados(self, obj):
        return obj.items_verificados()

    def get_total_items(self, obj):
        return len(ChecklistVehiculo.ITEMS_INSPECCION) + 1  # + nivel_combustible verificado


class ValidarChecklistSerializer(serializers.ModelSerializer):
    validado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistVehiculo
        fields = ('id', 'validado', 'observaciones', 'validado_por', 'validado_por_nombre', 'validado_en')
        read_only_fields = ('id', 'validado_por', 'validado_en')

    def get_validado_por_nombre(self, obj):
        if obj.validado_por:
            return obj.validado_por.get_full_name() or obj.validado_por.username
        return None

    def update(self, instance, validated_data):
        if validated_data.get('validado'):
            instance.validado_por = self.context['request'].user
            instance.validado_en = timezone.now()
        instance.validado = validated_data.get('validado', instance.validado)
        if 'observaciones' in validated_data:
            instance.observaciones = validated_data['observaciones']
        instance.save()
        return instance


class AlertaFlotaSerializer(serializers.ModelSerializer):
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    urgencia = serializers.SerializerMethodField()
    resuelta_por_detalle = UsuarioResumenSerializer(source='resuelta_por', read_only=True)

    class Meta:
        model = AlertaFlota
        fields = (
            'id', 'vehiculo', 'vehiculo_detalle', 'tipo', 'tipo_display', 'descripcion',
            'km_alerta', 'fecha_alerta', 'activa', 'resuelta', 'resuelta_por',
            'resuelta_por_detalle', 'resuelta_en', 'urgencia', 'created_at',
        )
        read_only_fields = fields

    def get_urgencia(self, obj):
        hoy = timezone.now().date()

        if obj.fecha_alerta:
            dias = (obj.fecha_alerta - hoy).days
            if dias <= 7:
                return 'critico'
            if dias <= 30:
                return 'proximo'
            return 'preventivo'

        if obj.km_alerta is not None:
            restante = obj.km_alerta - float(obj.vehiculo.kilometraje_actual)
            if restante <= 0:
                return 'critico'
            if restante <= 500:
                return 'preventivo'
            return 'proximo'

        return 'proximo'


class ResolverAlertaSerializer(serializers.ModelSerializer):
    notas = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = AlertaFlota
        fields = ('resuelta', 'notas')

    def update(self, instance, validated_data):
        notas = validated_data.pop('notas', '')
        instance.resuelta = True
        instance.activa = False
        instance.resuelta_por = self.context['request'].user
        instance.resuelta_en = timezone.now()
        if notas:
            instance.descripcion = f'{instance.descripcion}\n\nResuelta: {notas}'
        instance.save()
        return instance
