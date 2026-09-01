from django.urls import path

from .views import (
    AprobarCotizacionView,
    AutorizarCompraView,
    AutorizarProyectoView,
    AvanceProyectoListCreateView,
    CompraProyectoListCreateView,
    ContratistaDetailView,
    ContratistaListCreateView,
    CotizacionListCreateView,
    DevolverItemView,
    ItemProyectoListCreateView,
    ProyectoDetailView,
    ProyectoListCreateView,
    RechazarProyectoView,
    RegistrarMovimientoItemView,
    ResumenProyectosView,
)

urlpatterns = [
    path('proyectos/', ProyectoListCreateView.as_view(), name='proyecto-list-create'),
    path('proyectos/<int:pk>/', ProyectoDetailView.as_view(), name='proyecto-detail'),
    path('proyectos/<int:pk>/autorizar/', AutorizarProyectoView.as_view(), name='proyecto-autorizar'),
    path('proyectos/<int:pk>/rechazar/', RechazarProyectoView.as_view(), name='proyecto-rechazar'),
    path('proyectos/<int:pk>/cotizaciones/', CotizacionListCreateView.as_view(), name='cotizacion-list-create'),
    path(
        'proyectos/<int:pk>/cotizaciones/<int:cotizacion_id>/aprobar/',
        AprobarCotizacionView.as_view(),
        name='cotizacion-aprobar',
    ),
    path('proyectos/<int:pk>/compras/', CompraProyectoListCreateView.as_view(), name='compra-proyecto-list-create'),
    path(
        'proyectos/<int:pk>/compras/<int:compra_id>/autorizar/',
        AutorizarCompraView.as_view(),
        name='compra-proyecto-autorizar',
    ),
    path('proyectos/<int:pk>/avances/', AvanceProyectoListCreateView.as_view(), name='avance-list-create'),
    path('proyectos/<int:pk>/inventario/', ItemProyectoListCreateView.as_view(), name='item-proyecto-list-create'),
    path(
        'proyectos/<int:pk>/inventario/<int:item_id>/movimiento/',
        RegistrarMovimientoItemView.as_view(),
        name='item-proyecto-movimiento',
    ),
    path(
        'proyectos/<int:pk>/inventario/<int:item_id>/devolver/',
        DevolverItemView.as_view(),
        name='item-proyecto-devolver',
    ),
    path('contratistas/', ContratistaListCreateView.as_view(), name='contratista-list-create'),
    path('contratistas/<int:pk>/', ContratistaDetailView.as_view(), name='contratista-detail'),
    path('resumen/', ResumenProyectosView.as_view(), name='proyectos-resumen'),
]
