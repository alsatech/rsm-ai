from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import AdvertenciaChecklist, AlertaFlota, AudioChecklist, ChecklistVehiculo, FotoChecklist, Vehiculo

User = get_user_model()

MAX_FOTOS = 12


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
            'items_verificados': ultimo.items_verificados(),
            'total_items': ultimo.total_items(),
        }

    def get_alertas_activas_count(self, obj):
        alertas = getattr(obj, 'alertas_activas_prefetch', None)
        if alertas is not None:
            return len(alertas)
        return obj.alertas.filter(activa=True, resuelta=False).count()


class FotoChecklistSerializer(serializers.ModelSerializer):
    uploaded_by_nombre = serializers.SerializerMethodField()
    item_display = serializers.CharField(source='get_item_display', read_only=True)

    class Meta:
        model = FotoChecklist
        fields = ('id', 'item', 'item_display', 'foto', 'descripcion', 'uploaded_by', 'uploaded_by_nombre', 'created_at')
        read_only_fields = ('id', 'uploaded_by', 'created_at')

    def get_uploaded_by_nombre(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def validate(self, data):
        checklist = self.context.get('checklist')
        if checklist and checklist.fotos.count() >= MAX_FOTOS:
            raise serializers.ValidationError(
                f'Este checklist ya tiene el máximo de {MAX_FOTOS} fotos permitidas.'
            )
        return data


class AdvertenciaChecklistSerializer(serializers.ModelSerializer):
    creada_por_detalle = UsuarioResumenSerializer(source='creada_por', read_only=True)

    class Meta:
        model = AdvertenciaChecklist
        fields = ('id', 'checklist', 'motivo', 'creada_por', 'creada_por_detalle', 'created_at')
        read_only_fields = ('id', 'checklist', 'creada_por', 'created_at')


class AudioChecklistSerializer(serializers.ModelSerializer):
    """Audio (nota de voz) adjunto a un checklist. Se sube vía multipart/form-data."""

    uploaded_by_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AudioChecklist
        fields = (
            'id', 'checklist', 'audio', 'duracion_segundos', 'descripcion',
            'uploaded_by', 'uploaded_by_nombre', 'created_at',
        )
        read_only_fields = ('id', 'checklist', 'uploaded_by', 'created_at')

    def get_uploaded_by_nombre(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def validate_audio(self, value):
        # 5 MB de tope — los audios de voz cortos (webm/ogg/m4a) rara vez pasan de 1 MB.
        max_bytes = 5 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError(
                f'El audio pesa {value.size / 1024 / 1024:.1f} MB; el máximo permitido es 5 MB.'
            )
        # Content-type puede venir vacío en algunos navegadores; validamos por extensión como fallback.
        ok_exts = ('.webm', '.ogg', '.mp3', '.m4a', '.wav', '.mp4')
        name = (value.name or '').lower()
        if not name.endswith(ok_exts):
            raise serializers.ValidationError(
                f'Formato de audio no soportado ({name}). Usa webm, ogg, mp3, m4a, wav o mp4.'
            )
        return value


class SalidaRelacionadaSerializer(serializers.ModelSerializer):
    """Resumen ligero de la salida que está cerrando una llegada.

    Se usa como nested read-only en `ChecklistVehiculoSerializer.salida_relacionada_detalle`
    y como payload principal del endpoint `salidas-pendientes`.
    """

    responsable_detalle = UsuarioResumenSerializer(source='responsable', read_only=True)
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)
    items_verificados = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistVehiculo
        fields = (
            'id', 'vehiculo', 'vehiculo_detalle', 'tipo_reporte',
            'responsable', 'responsable_detalle', 'fecha_hora',
            'items_verificados', 'total_items',
        )
        read_only_fields = fields

    def get_items_verificados(self, obj):
        return obj.items_verificados()

    def get_total_items(self, obj):
        return obj.total_items()


class ChecklistVehiculoSerializer(serializers.ModelSerializer):
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)
    responsable = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    responsable_detalle = UsuarioResumenSerializer(source='responsable', read_only=True)
    validado_por_detalle = UsuarioResumenSerializer(source='validado_por', read_only=True)
    tipo_reporte_display = serializers.CharField(source='get_tipo_reporte_display', read_only=True)
    traila = serializers.PrimaryKeyRelatedField(
        queryset=Vehiculo.objects.filter(tipo=Vehiculo.Tipo.TRAILA), required=False, allow_null=True,
    )
    traila_detalle = VehiculoSerializer(source='traila', read_only=True)
    fotos = FotoChecklistSerializer(many=True, read_only=True)
    audios = AudioChecklistSerializer(many=True, read_only=True)
    advertencias = AdvertenciaChecklistSerializer(many=True, read_only=True)
    items_verificados = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    items_aplicables = serializers.SerializerMethodField()
    salida_relacionada = serializers.PrimaryKeyRelatedField(
        queryset=ChecklistVehiculo.objects.filter(tipo_reporte=ChecklistVehiculo.TipoReporte.SALIDA),
        required=False,
        allow_null=True,
    )
    salida_relacionada_detalle = SalidaRelacionadaSerializer(
        source='salida_relacionada', read_only=True,
    )
    proyecto = serializers.CharField(max_length=200, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = ChecklistVehiculo
        fields = (
            'id', 'vehiculo', 'vehiculo_detalle', 'tipo_reporte', 'tipo_reporte_display',
            'responsable', 'responsable_detalle', 'fecha_hora', 'km_reporte', 'nivel_combustible',
            'estado_fisico', 'lavado', 'soplado_filtro_aire',
            'anticongelante', 'nivel_aceite_motor', 'nivel_aceite_transmision',
            'carga_traila', 'traila', 'traila_detalle', 'limpieza', 'sin_herramientas', 'sin_carga',
            'traila_limpieza', 'traila_sin_herramientas', 'traila_sin_carga',
            'incidencia_previa', 'incidencia_nueva',
            'proyecto',
            'salida_relacionada', 'salida_relacionada_detalle',
            'observaciones', 'validado', 'validado_por', 'validado_por_detalle', 'validado_en',
            'fotos', 'audios', 'advertencias', 'items_verificados', 'total_items', 'items_aplicables', 'created_at',
        )
        read_only_fields = (
            'id', 'validado', 'validado_por', 'validado_en', 'created_at',
        )

    def get_items_verificados(self, obj):
        return obj.items_verificados()

    def get_total_items(self, obj):
        return obj.total_items()

    def get_items_aplicables(self, obj):
        return obj.items_aplicables()

    def validate(self, data):
        vehiculo = data.get('vehiculo') or getattr(self.instance, 'vehiculo', None)

        tipo_reporte = data.get('tipo_reporte', getattr(self.instance, 'tipo_reporte', None))

        if (
            vehiculo
            and tipo_reporte == ChecklistVehiculo.TipoReporte.SALIDA
            and vehiculo.estado in (Vehiculo.Estado.EN_TALLER, Vehiculo.Estado.DE_BAJA)
        ):
            raise serializers.ValidationError({
                'vehiculo': f'{vehiculo.nombre} está {vehiculo.get_estado_display().lower()} — no puede salir hasta que se repare.'
            })

        # Proyecto es OPCIONAL en salidas — solo se registra si el vehículo se está
        # usando para un proyecto específico. Si se tomó para otra cosa (traslado personal,
        # mantenimiento, comisión administrativa, etc.) se puede dejar vacío y aclararlo
        # en observaciones. En llegadas no se exige: la llegada hereda el proyecto de la
        # salida a la que se vincula.
        if tipo_reporte == ChecklistVehiculo.TipoReporte.SALIDA:
            proyecto_valor = data.get('proyecto', None)
            if proyecto_valor is None:
                proyecto_valor = getattr(self.instance, 'proyecto', '')
            # Normalizamos: string vacío o solo espacios → None para no guardar ''.
            proyecto_valor = (proyecto_valor or '').strip() or None
            data['proyecto'] = proyecto_valor

        traila = data.get('traila')
        if traila and traila.modelo != '4x5':
            raise serializers.ValidationError({
                'traila': 'Solo se pueden jalar trailas de 4x5.'
            })

        # Vincular llegadas con su salida del mismo vehículo y mismo día.
        salida_rel = data.get('salida_relacionada')
        if tipo_reporte == ChecklistVehiculo.TipoReporte.LLEGADA:
            # Permitir PATCH sin re-especificar salida si ya viene vinculada.
            if salida_rel is None and not getattr(self.instance, 'salida_relacionada_id', None):
                raise serializers.ValidationError({
                    'salida_relacionada': 'Debes seleccionar la salida que estás cerrando.'
                })

            if salida_rel is not None:
                if salida_rel.tipo_reporte != ChecklistVehiculo.TipoReporte.SALIDA:
                    raise serializers.ValidationError({
                        'salida_relacionada': 'Solo se pueden cerrar salidas.'
                    })
                if salida_rel.vehiculo_id != (vehiculo.id if vehiculo else getattr(self.instance, 'vehiculo_id', None)):
                    raise serializers.ValidationError({
                        'salida_relacionada': 'La salida no corresponde a este vehículo.'
                    })
                # Regla: la salida debe ser del mismo día de la llegada o de 1 día antes.
                # 2+ días de diferencia no se permite.
                fecha_llegada = data.get('fecha_hora') or getattr(self.instance, 'fecha_hora', None)
                if fecha_llegada:
                    diferencia = (fecha_llegada.date() - salida_rel.fecha_hora.date()).days
                    if diferencia < 0 or diferencia > 1:
                        raise serializers.ValidationError({
                            'salida_relacionada': 'La salida debe ser del mismo día o de 1 día antes de la llegada.'
                        })
                # Una salida no puede ser cerrada dos veces (además del UniqueConstraint en BD).
                ya_cerrada_por_otro = ChecklistVehiculo.objects.filter(
                    salida_relacionada=salida_rel,
                ).exclude(
                    pk=getattr(self.instance, 'pk', None),
                ).exists()
                if ya_cerrada_por_otro:
                    raise serializers.ValidationError({
                        'salida_relacionada': 'Esta salida ya fue cerrada por otra llegada.'
                    })

        if tipo_reporte == ChecklistVehiculo.TipoReporte.SALIDA and salida_rel is not None:
            raise serializers.ValidationError({
                'salida_relacionada': 'Las salidas no se vinculan entre sí.'
            })

        return data


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
