from django.urls import path

from .views import RegistroHidraulicoDetailView, RegistroHidraulicoListCreateView

urlpatterns = [
    path('', RegistroHidraulicoListCreateView.as_view(), name='hidraulica-list-create'),
    path('<int:pk>/', RegistroHidraulicoDetailView.as_view(), name='hidraulica-detail'),
]
