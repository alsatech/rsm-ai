from django.urls import path

from .views import (
    CorraletaDetailView,
    CorraletaListCreateView,
    FotoRecorridoDeleteView,
    FotoRecorridoListView,
    RecorridoGanadoDetailView,
    RecorridoGanadoListCreateView,
    ResumenGanadoView,
)

urlpatterns = [
    path('corraletas/', CorraletaListCreateView.as_view(), name='corraleta-list-create'),
    path('corraletas/<int:pk>/', CorraletaDetailView.as_view(), name='corraleta-detail'),
    path('recorridos/', RecorridoGanadoListCreateView.as_view(), name='recorrido-list-create'),
    path('recorridos/resumen/', ResumenGanadoView.as_view(), name='recorrido-resumen'),
    path('recorridos/<int:pk>/', RecorridoGanadoDetailView.as_view(), name='recorrido-detail'),
    path('recorridos/<int:pk>/fotos/', FotoRecorridoListView.as_view(), name='recorrido-fotos'),
    path(
        'recorridos/<int:pk>/fotos/<int:foto_id>/',
        FotoRecorridoDeleteView.as_view(),
        name='recorrido-foto-delete',
    ),
]
