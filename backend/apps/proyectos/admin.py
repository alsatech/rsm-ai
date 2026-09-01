from django.contrib import admin

from .models import (
    AvanceProyecto,
    CompraProyecto,
    Contratista,
    CotizacionManoObra,
    DevolucionInventario,
    FotoAvance,
    FotoCompra,
    ItemProyecto,
    MovimientoProyecto,
    Proyecto,
)


@admin.register(Contratista)
class ContratistaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'empresa', 'especialidad', 'telefono', 'activo')
    list_filter = ('especialidad', 'activo')
    search_fields = ('nombre', 'empresa', 'especialidad')


class CotizacionInline(admin.TabularInline):
    model = CotizacionManoObra
    extra = 0


class ItemProyectoInline(admin.TabularInline):
    model = ItemProyecto
    extra = 0


@admin.register(Proyecto)
class ProyectoAdmin(admin.ModelAdmin):
    list_display = ('folio', 'nombre', 'estado', 'presupuesto_total', 'requiere_autorizacion', 'asignado_a', 'creado_por')
    list_filter = ('estado', 'requiere_autorizacion')
    search_fields = ('folio', 'nombre')
    raw_id_fields = ('autorizado_por', 'creado_por', 'asignado_a')
    inlines = [CotizacionInline, ItemProyectoInline]


@admin.register(CotizacionManoObra)
class CotizacionManoObraAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'contratista', 'monto', 'estado', 'created_at')
    list_filter = ('estado',)
    raw_id_fields = ('proyecto', 'contratista', 'aprobada_por', 'created_by')


@admin.register(ItemProyecto)
class ItemProyectoAdmin(admin.ModelAdmin):
    list_display = ('codigo_proyecto', 'proyecto', 'descripcion', 'stock_actual', 'unidad')
    search_fields = ('codigo_proyecto', 'descripcion')
    raw_id_fields = ('proyecto', 'producto_ref')


@admin.register(MovimientoProyecto)
class MovimientoProyectoAdmin(admin.ModelAdmin):
    list_display = ('item', 'tipo', 'cantidad', 'responsable', 'fecha_movimiento')
    list_filter = ('tipo',)
    raw_id_fields = ('item', 'responsable', 'compra_ref')


class FotoCompraInline(admin.TabularInline):
    model = FotoCompra
    extra = 0


@admin.register(CompraProyecto)
class CompraProyectoAdmin(admin.ModelAdmin):
    list_display = ('folio_compra', 'proyecto', 'monto_total', 'requiere_autorizacion', 'estado', 'created_at')
    list_filter = ('estado', 'requiere_autorizacion')
    search_fields = ('folio_compra', 'proveedor_nombre')
    raw_id_fields = ('proyecto', 'contratista_proveedor', 'autorizado_por', 'created_by')
    inlines = [FotoCompraInline]


class FotoAvanceInline(admin.TabularInline):
    model = FotoAvance
    extra = 0


@admin.register(AvanceProyecto)
class AvanceProyectoAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'porcentaje', 'registrado_por', 'fecha_avance')
    raw_id_fields = ('proyecto', 'registrado_por')
    inlines = [FotoAvanceInline]


@admin.register(DevolucionInventario)
class DevolucionInventarioAdmin(admin.ModelAdmin):
    list_display = ('item', 'producto_inventario', 'cantidad', 'registrado_por', 'fecha')
    raw_id_fields = ('proyecto', 'item', 'producto_inventario', 'registrado_por')
