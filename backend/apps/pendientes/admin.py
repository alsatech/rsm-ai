from django.contrib import admin

from .models import FotoPendiente, HistorialPendiente, Pendiente


class FotoPendienteInline(admin.TabularInline):
    model = FotoPendiente
    extra = 0
    readonly_fields = ('uploaded_by', 'created_at')


class HistorialInline(admin.TabularInline):
    model = HistorialPendiente
    extra = 0
    readonly_fields = ('usuario', 'cambio', 'estado_anterior', 'estado_nuevo', 'nota', 'fecha')
    can_delete = False


@admin.register(Pendiente)
class PendienteAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'estado', 'prioridad', 'origen', 'created_by', 'fecha_asignacion', 'created_at')
    list_filter = ('estado', 'prioridad', 'origen', 'modulo_relacionado')
    search_fields = ('titulo', 'descripcion')
    readonly_fields = ('created_by', 'created_at', 'updated_at', 'cerrado_por', 'fecha_cierre')
    inlines = [FotoPendienteInline, HistorialInline]
