from django.urls import path

from .views import (
    AgregarParadaView,
    ClasificacionCorraletasView,
    CorraletaDetailView,
    CorraletaListCreateView,
    CrearPlanView,
    EditarPlanView,
    EliminarParadaView,
    FinalizarRecorridoView,
    FotoRecorridoDeleteView,
    FotoRecorridoListView,
    HeatmapPastoreoView,
    IniciarRecorridoView,
    PlanDelDiaView,
    RecorridoGanadoDetailView,
    RecorridoGanadoListCreateView,
    ResumenGanadoView,
    SyncParadasView,
)

urlpatterns = [
    path('corraletas/', CorraletaListCreateView.as_view(), name='corraleta-list-create'),
    path('corraletas/clasificacion/', ClasificacionCorraletasView.as_view(), name='corraleta-clasificacion'),
    path('corraletas/<int:pk>/', CorraletaDetailView.as_view(), name='corraleta-detail'),
    path('heatmap/', HeatmapPastoreoView.as_view(), name='ganado-heatmap'),
    path('recorridos/iniciar/', IniciarRecorridoView.as_view(), name='recorrido-iniciar'),
    path('recorridos/crear-plan/', CrearPlanView.as_view(), name='recorrido-crear-plan'),
    path('recorridos/plan-del-dia/', PlanDelDiaView.as_view(), name='recorrido-plan-del-dia'),
    path('recorridos/', RecorridoGanadoListCreateView.as_view(), name='recorrido-list-create'),
    path('recorridos/resumen/', ResumenGanadoView.as_view(), name='recorrido-resumen'),
    path('recorridos/<int:pk>/', RecorridoGanadoDetailView.as_view(), name='recorrido-detail'),
    path('recorridos/<int:pk>/editar-plan/', EditarPlanView.as_view(), name='recorrido-editar-plan'),
    path('recorridos/<int:pk>/agregar-parada/', AgregarParadaView.as_view(), name='recorrido-agregar-parada'),
    path(
        'recorridos/<int:pk>/paradas/<int:parada_id>/',
        EliminarParadaView.as_view(),
        name='recorrido-eliminar-parada',
    ),
    path('recorridos/<int:pk>/finalizar/', FinalizarRecorridoView.as_view(), name='recorrido-finalizar'),
    path('recorridos/<int:pk>/sync-paradas/', SyncParadasView.as_view(), name='recorrido-sync-paradas'),
    path('recorridos/<int:pk>/fotos/', FotoRecorridoListView.as_view(), name='recorrido-fotos'),
    path(
        'recorridos/<int:pk>/fotos/<int:foto_id>/',
        FotoRecorridoDeleteView.as_view(),
        name='recorrido-foto-delete',
    ),
]
