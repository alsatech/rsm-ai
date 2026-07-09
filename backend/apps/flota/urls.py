from django.urls import path

from .views import (
    AlertaFlotaListView,
    ChecklistDetailView,
    ChecklistListCreateView,
    FotoChecklistDeleteView,
    FotoChecklistListView,
    ResolverAlertaView,
    ResumenFlotaView,
    VehiculoDetailView,
    VehiculoHistorialView,
    VehiculoListCreateView,
)

urlpatterns = [
    path('vehiculos/', VehiculoListCreateView.as_view(), name='vehiculo-list-create'),
    path('vehiculos/<int:pk>/', VehiculoDetailView.as_view(), name='vehiculo-detail'),
    path('vehiculos/<int:pk>/historial/', VehiculoHistorialView.as_view(), name='vehiculo-historial'),
    path('checklists/', ChecklistListCreateView.as_view(), name='checklist-list-create'),
    path('checklists/<int:pk>/', ChecklistDetailView.as_view(), name='checklist-detail'),
    path('checklists/<int:pk>/fotos/', FotoChecklistListView.as_view(), name='checklist-fotos'),
    path(
        'checklists/<int:pk>/fotos/<int:foto_id>/',
        FotoChecklistDeleteView.as_view(),
        name='checklist-foto-delete',
    ),
    path('alertas/', AlertaFlotaListView.as_view(), name='alerta-list'),
    path('alertas/<int:pk>/resolver/', ResolverAlertaView.as_view(), name='alerta-resolver'),
    path('resumen/', ResumenFlotaView.as_view(), name='flota-resumen'),
]
