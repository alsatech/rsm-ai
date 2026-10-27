from django.urls import path

from .views import GenerarMinutaView, MinutaDetalleView, MinutaListView, MinutaPDFView

urlpatterns = [
    path('', MinutaListView.as_view(), name='minuta-list'),
    path('<str:fecha>/', MinutaDetalleView.as_view(), name='minuta-detalle'),
    path('<str:fecha>/generar/', GenerarMinutaView.as_view(), name='minuta-generar'),
    path('<str:fecha>/pdf/', MinutaPDFView.as_view(), name='minuta-pdf'),
]
