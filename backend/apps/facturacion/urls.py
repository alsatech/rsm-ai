from django.urls import path

from .views import (
    FacturaDetailView,
    FacturaListCreateView,
    FacturasPorMesView,
    GenerarRelacionView,
    ImportarFacturasView,
    RelacionMensualListView,
    ResumenFacturacionView,
)

urlpatterns = [
    path('facturas/', FacturaListCreateView.as_view(), name='factura-list-create'),
    path('facturas/<int:pk>/', FacturaDetailView.as_view(), name='factura-detail'),
    path('facturas/por-mes/', FacturasPorMesView.as_view(), name='factura-por-mes'),
    path('resumen/', ResumenFacturacionView.as_view(), name='facturacion-resumen'),
    path('relaciones/generar/', GenerarRelacionView.as_view(), name='relacion-generar'),
    path('relaciones/', RelacionMensualListView.as_view(), name='relacion-list'),
    path('importar/', ImportarFacturasView.as_view(), name='facturacion-importar'),
]
