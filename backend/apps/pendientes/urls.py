from django.urls import path

from .views import (
    CambiarEstadoPendienteView,
    FotoPendienteDeleteView,
    FotoPendienteListView,
    HistorialPendienteView,
    ImportarPendientesArchivoView,
    PendienteDetailView,
    PendienteListCreateView,
    ResumenPendientesView,
)

urlpatterns = [
    path('', PendienteListCreateView.as_view(), name='pendiente-list-create'),
    path('importar-archivo/', ImportarPendientesArchivoView.as_view(), name='pendiente-importar-archivo'),
    path('resumen/', ResumenPendientesView.as_view(), name='pendiente-resumen'),
    path('<int:pk>/', PendienteDetailView.as_view(), name='pendiente-detail'),
    path('<int:pk>/historial/', HistorialPendienteView.as_view(), name='pendiente-historial'),
    path('<int:pk>/cambiar-estado/', CambiarEstadoPendienteView.as_view(), name='pendiente-cambiar-estado'),
    path('<int:pk>/fotos/', FotoPendienteListView.as_view(), name='pendiente-fotos'),
    path('<int:pk>/fotos/<int:foto_id>/', FotoPendienteDeleteView.as_view(), name='pendiente-foto-delete'),
]
