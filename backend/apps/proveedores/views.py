from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Proveedor
from .permissions import PuedeCrudProveedores
from .serializers import ProveedorSerializer


class ProveedorListCreateView(generics.ListCreateAPIView):
    serializer_class = ProveedorSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), PuedeCrudProveedores()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Proveedor.objects.select_related('created_by')
        p = self.request.query_params
        q = p.get('q')
        tipo = p.get('tipo')
        activo = p.get('activo')
        if q:
            qs = qs.filter(Q(nombre__icontains=q) | Q(especialidad__icontains=q) | Q(empresa__icontains=q))
        if tipo:
            qs = qs.filter(tipo=tipo)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProveedorDetailView(generics.RetrieveUpdateAPIView):
    queryset = Proveedor.objects.select_related('created_by')
    serializer_class = ProveedorSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), PuedeCrudProveedores()]
        return [IsAuthenticated()]
