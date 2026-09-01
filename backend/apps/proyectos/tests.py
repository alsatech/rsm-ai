from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.inventario.models import CategoriaInventario, Producto, Ubicacion
from apps.users.models import User

from .models import Contratista, ItemProyecto, Proyecto


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


class ProyectosAPITest(APITestCase):
    def setUp(self):
        self.superadmin = crear_usuario('alberto_test', 'superadmin')
        self.operaciones = crear_usuario('erik_test', 'operaciones')
        self.administrador = crear_usuario('abigail_test', 'administrador')
        self.campo = crear_usuario('chino_test', 'campo')

        categoria, _ = CategoriaInventario.objects.get_or_create(nombre='Materiales de prueba', defaults={'color': '#1f6b3e'})
        ubicacion, _ = Ubicacion.objects.get_or_create(nombre='bodega')
        self.producto = Producto.objects.create(
            codigo='PRY-TEST-001', descripcion='Cemento', categoria=categoria, ubicacion=ubicacion, stock_actual=10,
        )

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_proyecto(self, presupuesto_total=None):
        self._auth(self.superadmin)
        resp = self.client.post('/api/v1/proyectos/proyectos/', {
            'nombre': 'Cerca norte',
            'descripcion': 'Reponer cerca dañada',
            'asignado_a': self.operaciones.id,
            'presupuesto_total': presupuesto_total,
        }, format='json')
        return resp

    def test_proyecto_mayor_50k_requiere_autorizacion(self):
        resp = self._crear_proyecto(presupuesto_total='60000.00')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['requiere_autorizacion'])

        resp_bajo = self._crear_proyecto(presupuesto_total='20000.00')
        self.assertFalse(resp_bajo.data['requiere_autorizacion'])

    def test_folio_autogenerado_unico(self):
        resp1 = self._crear_proyecto(presupuesto_total='1000.00')
        resp2 = self._crear_proyecto(presupuesto_total='1000.00')
        self.assertNotEqual(resp1.data['folio'], resp2.data['folio'])
        self.assertTrue(resp1.data['folio'].startswith('PRY'))

    def test_solo_superadmin_autoriza(self):
        resp = self._crear_proyecto(presupuesto_total='60000.00')
        proyecto_id = resp.data['id']

        self._auth(self.operaciones)
        resp_erik = self.client.post(f'/api/v1/proyectos/proyectos/{proyecto_id}/autorizar/', {}, format='json')
        self.assertEqual(resp_erik.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.superadmin)
        resp_ok = self.client.post(f'/api/v1/proyectos/proyectos/{proyecto_id}/autorizar/', {}, format='json')
        self.assertEqual(resp_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_ok.data['estado'], 'autorizado')

    def test_erik_no_puede_autorizar(self):
        resp = self._crear_proyecto(presupuesto_total='60000.00')
        proyecto_id = resp.data['id']
        self._auth(self.operaciones)
        resp_erik = self.client.post(f'/api/v1/proyectos/proyectos/{proyecto_id}/rechazar/', {
            'notas_autorizacion': 'No aplica',
        }, format='json')
        self.assertEqual(resp_erik.status_code, status.HTTP_403_FORBIDDEN)

    def test_erik_no_puede_crear_proyecto(self):
        self._auth(self.operaciones)
        resp = self.client.post('/api/v1/proyectos/proyectos/', {
            'nombre': 'Cerca norte', 'descripcion': 'x', 'asignado_a': self.operaciones.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_stock_proyecto_no_puede_ser_negativo(self):
        proyecto = Proyecto.objects.create(
            nombre='Cerca norte', descripcion='x', creado_por=self.superadmin, asignado_a=self.operaciones,
        )
        item = ItemProyecto.objects.create(
            proyecto=proyecto, descripcion='Alambre', unidad='rollo', stock_inicial=5, stock_actual=5,
        )

        self._auth(self.operaciones)
        resp = self.client.post(
            f'/api/v1/proyectos/proyectos/{proyecto.id}/inventario/{item.id}/movimiento/',
            {'tipo': 'salida', 'cantidad': '999.00'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        item.refresh_from_db()
        self.assertEqual(item.stock_actual, 5)

    def test_devolucion_actualiza_inventario_general(self):
        proyecto = Proyecto.objects.create(
            nombre='Cerca norte', descripcion='x', creado_por=self.superadmin, asignado_a=self.operaciones,
        )
        item = ItemProyecto.objects.create(
            proyecto=proyecto, producto_ref=self.producto, descripcion='Cemento', unidad='saco',
            stock_inicial=8, stock_actual=8,
        )

        self._auth(self.operaciones)
        resp = self.client.post(
            f'/api/v1/proyectos/proyectos/{proyecto.id}/inventario/{item.id}/devolver/',
            {'cantidad': '3.00'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        item.refresh_from_db()
        self.producto.refresh_from_db()
        self.assertEqual(item.stock_actual, 5)
        self.assertEqual(self.producto.stock_actual, 13)

    def test_contratista_crud_operaciones(self):
        self._auth(self.operaciones)
        resp = self.client.post('/api/v1/proyectos/contratistas/', {
            'nombre': 'Juan Pérez', 'especialidad': 'Albañilería',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        self._auth(self.campo)
        resp_campo = self.client.post('/api/v1/proyectos/contratistas/', {
            'nombre': 'Juan Pérez', 'especialidad': 'Albañilería',
        }, format='json')
        self.assertEqual(resp_campo.status_code, status.HTTP_403_FORBIDDEN)

    def test_operaciones_solo_ve_proyectos_asignados(self):
        Proyecto.objects.create(
            nombre='Asignado a Erik', descripcion='x', creado_por=self.superadmin, asignado_a=self.operaciones,
        )
        Proyecto.objects.create(
            nombre='Otro proyecto', descripcion='x', creado_por=self.superadmin, asignado_a=self.superadmin,
        )
        self._auth(self.operaciones)
        resp = self.client.get('/api/v1/proyectos/proyectos/')
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['nombre'], 'Asignado a Erik')

    def test_compra_mayor_50k_requiere_autorizacion(self):
        proyecto = Proyecto.objects.create(
            nombre='Cerca norte', descripcion='x', creado_por=self.superadmin, asignado_a=self.operaciones,
        )
        self._auth(self.operaciones)
        resp = self.client.post(f'/api/v1/proyectos/proyectos/{proyecto.id}/compras/', {
            'descripcion': 'Material eléctrico', 'monto_total': '75000.00',
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['requiere_autorizacion'])
        self.assertEqual(resp.data['estado'], 'pendiente_autorizacion')

        self._auth(self.superadmin)
        resp_auth = self.client.patch(
            f'/api/v1/proyectos/proyectos/{proyecto.id}/compras/{resp.data["id"]}/autorizar/',
            {'accion': 'autorizar'}, format='json',
        )
        self.assertEqual(resp_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_auth.data['estado'], 'autorizada')
