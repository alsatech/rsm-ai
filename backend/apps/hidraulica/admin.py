from django.contrib import admin

from .models import AlertaMantenimientoGenerador, ChecklistGenerador, Generador, RegistroHidraulico


@admin.register(RegistroHidraulico)
class RegistroHidraulicoAdmin(admin.ModelAdmin):
    list_display = ('punto_medicion', 'estado', 'fecha_hora', 'validado', 'created_by')
    list_filter = ('punto_medicion', 'estado', 'validado')
    date_hierarchy = 'fecha_hora'


@admin.register(Generador)
class GeneradorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'marca_modelo', 'horas_operacion', 'ultima_actualizacion', 'updated_by')
    list_filter = ('nombre',)


@admin.register(ChecklistGenerador)
class ChecklistGeneradorAdmin(admin.ModelAdmin):
    list_display = ('generador', 'fecha_hora', 'nivel_aceite', 'nivel_refrigerante', 'filtro_aire', 'sin_fugas', 'created_by')
    list_filter = ('generador',)
    date_hierarchy = 'fecha_hora'


@admin.register(AlertaMantenimientoGenerador)
class AlertaMantenimientoGeneradorAdmin(admin.ModelAdmin):
    list_display = ('generador', 'tipo_servicio', 'horas_intervalo', 'meses_intervalo', 'ultima_alerta', 'activa')
    list_filter = ('generador', 'activa')
