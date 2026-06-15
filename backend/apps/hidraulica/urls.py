from django.urls import path

from .views import (
    ChecklistGeneradorListCreateView,
    GeneradorDetailView,
    GeneradorListView,
    RegistroHidraulicoDetailView,
    RegistroHidraulicoListCreateView,
)

urlpatterns = [
    path('', RegistroHidraulicoListCreateView.as_view(), name='hidraulica-list-create'),
    path('<int:pk>/', RegistroHidraulicoDetailView.as_view(), name='hidraulica-detail'),
    path('generadores/', GeneradorListView.as_view(), name='generador-list'),
    path('generadores/<int:pk>/', GeneradorDetailView.as_view(), name='generador-detail'),
    path('generadores/<int:pk>/checklist/', ChecklistGeneradorListCreateView.as_view(), name='generador-checklist'),
]
