from django.contrib import admin

from .models import Corraleta, FotoRecorrido, ParadaRecorrido, RecorridoGanado


@admin.register(Corraleta)
class CorraletaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'lat', 'lng', 'activa')
    search_fields = ('nombre',)
    list_filter = ('activa',)


class ParadaRecorridoInline(admin.TabularInline):
    model = ParadaRecorrido
    extra = 0
    ordering = ('orden',)


class FotoRecorridoInline(admin.TabularInline):
    model = FotoRecorrido
    extra = 0


@admin.register(RecorridoGanado)
class RecorridoGanadoAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'responsable', 'estado_hato', 'numero_cabezas', 'color')
    list_filter = ('estado_hato', 'fecha', 'color')
    search_fields = ('responsable__username', 'narrativa')
    inlines = [ParadaRecorridoInline, FotoRecorridoInline]
    raw_id_fields = ('responsable', 'created_by')
