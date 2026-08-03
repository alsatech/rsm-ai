from django.urls import path

from .views import (
    AdvertenciaChecklistCreateView,
    AlertaFlotaListView,
    AudioChecklistDeleteView,
    AudioChecklistListView,
    ChecklistDetailView,
    ChecklistListCreateView,
    FotoChecklistDeleteView,
    FotoChecklistListView,
    IncidenciaListView,
    ResolverAlertaView,
    ResumenFlotaView,
    SalidasPendientesListView,
    VehiculoDetailView,
    VehiculoHistorialView,
    VehiculoListCreateView,
)

urlpatterns = [
    path('vehiculos/', VehiculoListCreateView.as_view(), name='vehiculo-list-create'),
    path('vehiculos/<int:pk>/', VehiculoDetailView.as_view(), name='vehiculo-detail'),
    path('vehiculos/<int:pk>/historial/', VehiculoHistorialView.as_view(), name='vehiculo-historial'),
    path('checklists/', ChecklistListCreateView.as_view(), name='checklist-list-create'),
    path(
        'checklists/salidas-pendientes/',
        SalidasPendientesListView.as_view(),
        name='checklist-salidas-pendientes',
    ),
    path('checklists/<int:pk>/', ChecklistDetailView.as_view(), name='checklist-detail'),
    path('checklists/<int:pk>/fotos/', FotoChecklistListView.as_view(), name='checklist-fotos'),
    path(
        'checklists/<int:pk>/fotos/<int:foto_id>/',
        FotoChecklistDeleteView.as_view(),
        name='checklist-foto-delete',
    ),
    path('checklists/<int:pk>/audios/', AudioChecklistListView.as_view(), name='checklist-audios'),
    path(
        'checklists/<int:pk>/audios/<int:audio_id>/',
        AudioChecklistDeleteView.as_view(),
        name='checklist-audio-delete',
    ),
    path(
        'checklists/<int:pk>/advertencias/',
        AdvertenciaChecklistCreateView.as_view(),
        name='checklist-advertencia',
    ),
    path('alertas/', AlertaFlotaListView.as_view(), name='alerta-list'),
    path('alertas/<int:pk>/resolver/', ResolverAlertaView.as_view(), name='alerta-resolver'),
    path('resumen/', ResumenFlotaView.as_view(), name='flota-resumen'),
    path('incidencias/', IncidenciaListView.as_view(), name='incidencia-list'),
]
