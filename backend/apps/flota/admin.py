from django.contrib import admin

from .models import AlertaFlota, ChecklistVehiculo, FotoChecklist, Vehiculo


@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'marca', 'modelo', 'anio', 'estado', 'kilometraje_actual')
    list_filter = ('tipo', 'estado')
    search_fields = ('nombre', 'marca', 'modelo', 'placas', 'numero_serie')


class FotoChecklistInline(admin.TabularInline):
    model = FotoChecklist
    extra = 0


@admin.register(ChecklistVehiculo)
class ChecklistVehiculoAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'tipo_reporte', 'responsable', 'fecha_hora', 'km_reporte', 'validado')
    list_filter = ('tipo_reporte', 'validado', 'vehiculo')
    search_fields = ('vehiculo__nombre', 'responsable__username')
    raw_id_fields = ('vehiculo', 'responsable', 'validado_por')
    inlines = [FotoChecklistInline]


@admin.register(AlertaFlota)
class AlertaFlotaAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'tipo', 'activa', 'resuelta', 'fecha_alerta', 'km_alerta')
    list_filter = ('tipo', 'activa', 'resuelta')
    search_fields = ('vehiculo__nombre',)
    raw_id_fields = ('vehiculo', 'resuelta_por')
