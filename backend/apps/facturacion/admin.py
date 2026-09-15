from django.contrib import admin

from .models import Factura, RelacionMensual


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = ('folio_interno', 'numero_factura', 'fecha', 'concepto', 'importe', 'modulo_origen', 'mes_reporte')
    list_filter = ('modulo_origen', 'mes_reporte')
    search_fields = ('folio_interno', 'numero_factura', 'concepto')
    raw_id_fields = ('registrado_por',)


@admin.register(RelacionMensual)
class RelacionMensualAdmin(admin.ModelAdmin):
    list_display = ('mes', 'numero_facturas', 'total', 'generado_por', 'created_at')
    raw_id_fields = ('generado_por',)
