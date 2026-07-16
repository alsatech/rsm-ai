from django.urls import path

from .views import (
    AlertasStockView,
    CategoriaInventarioListView,
    MovimientoDetailView,
    MovimientoListCreateView,
    ProductoDetailView,
    ProductoListCreateView,
    ProductoMovimientosView,
    ResumenInventarioView,
    UbicacionListView,
    ValidarMovimientoView,
)

urlpatterns = [
    path('productos/', ProductoListCreateView.as_view(), name='producto-list-create'),
    path('productos/<int:pk>/', ProductoDetailView.as_view(), name='producto-detail'),
    path('productos/<int:pk>/movimientos/', ProductoMovimientosView.as_view(), name='producto-movimientos'),
    path('movimientos/', MovimientoListCreateView.as_view(), name='movimiento-list-create'),
    path('movimientos/<int:pk>/', MovimientoDetailView.as_view(), name='movimiento-detail'),
    path('movimientos/<int:pk>/validar/', ValidarMovimientoView.as_view(), name='movimiento-validar'),
    path('categorias/', CategoriaInventarioListView.as_view(), name='categoria-list'),
    path('ubicaciones/', UbicacionListView.as_view(), name='ubicacion-list'),
    path('alertas-stock/', AlertasStockView.as_view(), name='alertas-stock'),
    path('resumen/', ResumenInventarioView.as_view(), name='inventario-resumen'),
]
