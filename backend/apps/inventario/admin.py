from django.contrib import admin

from .models import CategoriaInventario, MovimientoInventario, Producto, Ubicacion


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
