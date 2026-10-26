from django.contrib import admin

from .models import Proveedor


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'empresa', 'especialidad', 'ciudad', 'pais', 'activo')
    list_filter = ('tipo', 'activo')
    search_fields = ('nombre', 'empresa', 'especialidad', 'rfc')
