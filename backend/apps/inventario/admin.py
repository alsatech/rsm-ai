from django.contrib import admin

from .models import (
    CategoriaInventario,
    EnvioMaterial,
    FotoEnvio,
    ItemRecepcion,
    ItemSolicitud,
    MovimientoInventario,
    Producto,
    RecepcionMaterial,
    ReporteFaltanteDanio,
    SolicitudMaterial,
    Ubicacion,
)


@admin.register(CategoriaInventario)
class CategoriaInventarioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'color', 'icono')
    search_fields = ('nombre',)


@admin.register(Ubicacion)
class UbicacionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'descripcion', 'categoria', 'ubicacion', 'stock_actual', 'stock_minimo', 'activo')
    list_filter = ('categoria', 'ubicacion', 'activo')
    search_fields = ('codigo', 'descripcion')


@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = (
        'producto', 'tipo', 'cantidad', 'responsable', 'fecha_movimiento', 'validado', 'rechazado',
    )
    list_filter = ('tipo', 'validado', 'rechazado')
    search_fields = ('producto__codigo', 'producto__descripcion', 'responsable__username')
    raw_id_fields = ('producto', 'responsable', 'validado_por')


class ItemSolicitudInline(admin.TabularInline):
    model = ItemSolicitud
    extra = 0


@admin.register(SolicitudMaterial)
class SolicitudMaterialAdmin(admin.ModelAdmin):
    list_display = ('folio', 'area', 'solicitante', 'estado', 'fecha_requerida', 'created_at')
    list_filter = ('estado', 'area')
    search_fields = ('folio', 'descripcion_necesidad', 'solicitante__username')
    raw_id_fields = ('solicitante', 'autorizado_por', 'created_by')
    inlines = [ItemSolicitudInline]


class FotoEnvioInline(admin.TabularInline):
    model = FotoEnvio
    extra = 0


@admin.register(EnvioMaterial)
class EnvioMaterialAdmin(admin.ModelAdmin):
    list_display = ('solicitud', 'enviado_por', 'fecha_envio', 'estado')
    list_filter = ('estado',)
    raw_id_fields = ('solicitud', 'enviado_por')
    inlines = [FotoEnvioInline]


class ItemRecepcionInline(admin.TabularInline):
    model = ItemRecepcion
    extra = 0


@admin.register(RecepcionMaterial)
class RecepcionMaterialAdmin(admin.ModelAdmin):
    list_display = ('envio', 'recibido_por', 'fecha_recepcion', 'estado_general')
    list_filter = ('estado_general',)
    raw_id_fields = ('envio', 'recibido_por')
    inlines = [ItemRecepcionInline]


@admin.register(ReporteFaltanteDanio)
class ReporteFaltanteDanioAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'producto', 'reportado_por', 'estado', 'created_at')
    list_filter = ('tipo', 'estado')
    search_fields = ('descripcion', 'producto__codigo')
    raw_id_fields = ('producto', 'reportado_por', 'ubicacion', 'resuelto_por')
