from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import Proveedor


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


class ProveedoresAPITest(APITestCase):
    def setUp(self):
        self.superadmin = crear_usuario('alberto_test', 'superadmin')
        self.operaciones = crear_usuario('erik_test', 'operaciones')
        self.administrador = crear_usuario('abigail_test', 'administrador')
        self.inventario = crear_usuario('yajaira_test', 'inventario')
        self.campo = crear_usuario('chino_test', 'campo')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def test_operaciones_puede_dar_de_alta(self):
        self._auth(self.operaciones)
        resp = self.client.post('/api/v1/proveedores/', {
            'nombre': 'Ferretería del Valle', 'tipo': 'material', 'rfc': '', 'ciudad': 'Querétaro',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['created_by'], self.operaciones.id)

    def test_inventario_no_puede_dar_de_alta(self):
        self._auth(self.inventario)
        resp = self.client.post('/api/v1/proveedores/', {
            'nombre': 'Ferretería del Valle', 'tipo': 'material',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_campo_no_puede_dar_de_alta(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/proveedores/', {
            'nombre': 'Ferretería del Valle', 'tipo': 'material',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cualquier_autenticado_puede_listar(self):
        Proveedor.objects.create(nombre='Juan Pérez', tipo='contratista', created_by=self.operaciones)
        for rol_user in (self.inventario, self.campo, self.administrador):
            self._auth(rol_user)
            resp = self.client.get('/api/v1/proveedores/')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(len(resp.data), 1)

    def test_administrador_puede_editar(self):
        proveedor = Proveedor.objects.create(nombre='Juan Pérez', tipo='contratista', created_by=self.operaciones)
        self._auth(self.administrador)
        resp = self.client.patch(f'/api/v1/proveedores/{proveedor.id}/', {'activo': False}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        proveedor.refresh_from_db()
        self.assertFalse(proveedor.activo)

    def test_trabajo_antes_guarda_detalle(self):
        self._auth(self.operaciones)
        resp = self.client.post('/api/v1/proveedores/', {
            'nombre': 'Constructora López', 'tipo': 'contratista',
            'trabajo_antes': True, 'detalle_trabajo_previo': 'Remodelación de bodega en 2024',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['trabajo_antes'])
        self.assertEqual(resp.data['detalle_trabajo_previo'], 'Remodelación de bodega en 2024')
