from django.urls import path

from .views import ProveedorDetailView, ProveedorListCreateView

urlpatterns = [
    path('', ProveedorListCreateView.as_view(), name='proveedor-list-create'),
    path('<int:pk>/', ProveedorDetailView.as_view(), name='proveedor-detail'),
]
