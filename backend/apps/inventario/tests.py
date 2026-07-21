import json

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import (
    CategoriaInventario,
    EnvioMaterial,
    ItemSolicitud,
    MovimientoInventario,
    Producto,
    RecepcionMaterial,
    ReporteFaltanteDanio,
    SolicitudMaterial,
    Ubicacion,
)

TOTAL_PRODUCTOS_PRECARGADOS = 121


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


def crear_producto(codigo='SM-TEST-001', stock_actual=10, stock_minimo=5):
    categoria = CategoriaInventario.objects.first()
    ubicacion = Ubicacion.objects.first()
    return Producto.objects.create(
        codigo=codigo,
        descripcion='Producto de prueba',
        categoria=categoria,
        ubicacion=ubicacion,
        stock_actual=stock_actual,
        stock_minimo=stock_minimo,
    )


class ProductosPrecargadosTest(TestCase):
    def test_productos_precargados_existen(self):
        self.assertEqual(Producto.objects.count(), TOTAL_PRODUCTOS_PRECARGADOS)


class InventarioAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('chino_test', 'campo')
        self.inventario = crear_usuario('yajaira_test', 'inventario')
        self.operaciones = crear_usuario('erik_test', 'operaciones')
        self.admin = crear_usuario('abigail_test', 'administrador')
        self.superadmin = crear_usuario('alberto_test', 'superadmin')
        self.producto = crear_producto()

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _movimiento_data(self, tipo='salida', cantidad='2.00'):
        return {'producto': self.producto.id, 'tipo': tipo, 'cantidad': cantidad, 'uso_descripcion': 'Prueba'}

    def test_salida_reduce_stock(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/inventario/movimientos/', self._movimiento_data(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 8)
        self.assertEqual(resp.data['stock_anterior'], '10.00')
        self.assertEqual(resp.data['stock_resultante'], '8.00')

    def test_entrada_aumenta_stock(self):
        self._auth(self.inventario)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='5.00'), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 15)

    def test_stock_no_puede_ser_negativo(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='999.00'), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)

    def test_alerta_stock_minimo_se_genera(self):
        # stock_actual=10, stock_minimo=5 -> una salida de 6 deja el stock en 4 (<= minimo), dispara la alerta.
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='6.00'), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.producto.refresh_from_db()
        self.assertTrue(self.producto.en_stock_bajo)

    def test_yajaira_puede_validar(self):
        self._auth(self.inventario)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']

        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/validar/', {'accion': 'validar'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['validado'])
        self.assertEqual(resp.data['validado_por'], self.inventario.id)

    def test_admin_no_puede_validar(self):
        self._auth(self.inventario)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']

        self._auth(self.admin)
        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/validar/', {'accion': 'validar'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_rechazar_revierte_stock(self):
        self._auth(self.inventario)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='5.00'), format='json',
        )
        movimiento_id = resp.data['id']
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 15)

        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/validar/',
            {'accion': 'rechazar', 'nota': 'Factura no coincide'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['rechazado'])
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)

    def test_rechazar_requiere_nota(self):
        self._auth(self.inventario)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='5.00'), format='json',
        )
        movimiento_id = resp.data['id']

        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/validar/', {'accion': 'rechazar'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_campo_puede_registrar_salida(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_campo_no_puede_registrar_entrada(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada'), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_operaciones_no_puede_registrar_movimiento(self):
        self._auth(self.operaciones)
        resp = self.client.post('/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_campo_solo_ve_sus_movimientos(self):
        self._auth(self.campo)
        self.client.post('/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida'), format='json')

        self._auth(self.inventario)
        self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='1.00'), format='json',
        )

        self._auth(self.campo)
        resp = self.client.get('/api/v1/inventario/movimientos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['responsable'], self.campo.id)

    def test_inventario_ve_todos_los_movimientos(self):
        self._auth(self.campo)
        self.client.post('/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida'), format='json')

        self._auth(self.inventario)
        resp = self.client.get('/api/v1/inventario/movimientos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_alertas_stock_lista_productos_en_minimo(self):
        producto_bajo = crear_producto(codigo='SM-TEST-BAJO', stock_actual=3, stock_minimo=5)

        self._auth(self.operaciones)
        resp = self.client.get('/api/v1/inventario/alertas-stock/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        codigos = [p['codigo'] for p in resp.data]
        self.assertIn(producto_bajo.codigo, codigos)
        self.assertNotIn(self.producto.codigo, codigos)

    def test_campo_no_ve_alertas_stock(self):
        self._auth(self.campo)
        resp = self.client.get('/api/v1/inventario/alertas-stock/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_inventario_crea_producto(self):
        self._auth(self.inventario)
        categoria = CategoriaInventario.objects.first()
        ubicacion = Ubicacion.objects.first()
        resp = self.client.post('/api/v1/inventario/productos/', {
            'codigo': 'SM-NUEVO-001',
            'descripcion': 'Producto nuevo',
            'categoria': categoria.id,
            'ubicacion': ubicacion.id,
            'unidad_medida': 'pieza',
            'stock_minimo': '10.00',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_campo_no_puede_crear_producto(self):
        self._auth(self.campo)
        categoria = CategoriaInventario.objects.first()
        ubicacion = Ubicacion.objects.first()
        resp = self.client.post('/api/v1/inventario/productos/', {
            'codigo': 'SM-NUEVO-002',
            'descripcion': 'Producto nuevo',
            'categoria': categoria.id,
            'ubicacion': ubicacion.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_resumen_inventario(self):
        self._auth(self.inventario)
        resp = self.client.get('/api/v1/inventario/resumen/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_productos', resp.data)
        self.assertIn('alertas_stock', resp.data)

    def test_todos_los_roles_ven_productos(self):
        for user in (self.campo, self.inventario, self.operaciones, self.admin, self.superadmin):
            self._auth(user)
            resp = self.client.get('/api/v1/inventario/productos/')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)


def _fake_foto(nombre='evidencia.jpg'):
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(nombre, b'contenido-fake-de-imagen', content_type='image/jpeg')


class AdquisicionesAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('chino_adq', 'campo')
        self.inventario = crear_usuario('yajaira_adq', 'inventario')
        self.operaciones = crear_usuario('erik_adq', 'operaciones')
        self.admin = crear_usuario('abigail_adq', 'administrador')
        self.superadmin = crear_usuario('alberto_adq', 'superadmin')
        self.producto = crear_producto(codigo='SM-ADQ-001', stock_actual=10, stock_minimo=5)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_solicitud(self, user, estado='enviada', cantidad='5.00'):
        self._auth(user)
        payload = {
            'area': 'campo',
            'descripcion_necesidad': 'Material para bebederos',
            'estado': estado,
            'items': [
                {'producto': self.producto.id, 'cantidad_solicitada': cantidad, 'unidad': 'pieza'},
            ],
        }
        resp = self.client.post('/api/v1/inventario/solicitudes/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        return resp.data

    def _autorizar(self, solicitud_id):
        self._auth(self.admin)
        resp = self.client.post(f'/api/v1/inventario/solicitudes/{solicitud_id}/autorizar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        return resp.data

    def _enviar(self, solicitud_id, item_id, enviador, cantidad='5.00'):
        self._auth(enviador)
        data = {
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_enviada': cantidad}]),
            'vehiculo': 'Sierra',
            'notas_envio': 'Salida de bodega',
            'fotos': [_fake_foto()],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud_id}/enviar/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        return resp.data

    def test_folio_autogenerado_unico(self):
        s1 = self._crear_solicitud(self.campo)
        s2 = self._crear_solicitud(self.campo)
        self.assertTrue(s1['folio'].startswith('SM-'))
        self.assertNotEqual(s1['folio'], s2['folio'])

    def test_solo_admin_autoriza_solicitud(self):
        solicitud = self._crear_solicitud(self.campo)

        self._auth(self.campo)
        resp = self.client.post(f'/api/v1/inventario/solicitudes/{solicitud["id"]}/autorizar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.inventario)
        resp = self.client.post(f'/api/v1/inventario/solicitudes/{solicitud["id"]}/autorizar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        data = self._autorizar(solicitud['id'])
        self.assertEqual(data['estado'], 'autorizada')
        self.assertEqual(data['autorizado_por'], self.admin.id)

    def test_recibido_por_distinto_enviado_por(self):
        # se usa administrador como enviador porque es el único rol que puede enviar Y recibir,
        # para aislar la regla de "distinto usuario" de la regla de permisos por rol.
        solicitud = self._crear_solicitud(self.campo)
        self._autorizar(solicitud['id'])
        item_id = solicitud['items'][0]['id']
        self._enviar(solicitud['id'], item_id, self.admin)

        # el mismo que envió intenta recibir -> rechazado
        self._auth(self.admin)
        data = {
            'estado_general': 'completo',
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_recibida': '5.00', 'estado_item': 'ok'}]),
            'fotos_llegada': [_fake_foto('llegada.jpg')],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # un usuario distinto sí puede recibir
        self._auth(self.inventario)
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_recepcion_completa_genera_entrada_inventario(self):
        solicitud = self._crear_solicitud(self.campo, cantidad='5.00')
        self._autorizar(solicitud['id'])
        item_id = solicitud['items'][0]['id']
        self._enviar(solicitud['id'], item_id, self.operaciones, cantidad='5.00')

        stock_antes = self.producto.stock_actual

        self._auth(self.campo)
        data = {
            'estado_general': 'completo',
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_recibida': '5.00', 'estado_item': 'ok'}]),
            'fotos_llegada': [_fake_foto('llegada.jpg')],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        solicitud_db = SolicitudMaterial.objects.get(pk=solicitud['id'])
        self.assertEqual(solicitud_db.estado, SolicitudMaterial.Estado.RECIBIDA_COMPLETA)

        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, stock_antes + 5)

        movimiento = MovimientoInventario.objects.filter(
            producto=self.producto, tipo=MovimientoInventario.Tipo.ENTRADA,
        ).latest('fecha_hora_registro')
        self.assertEqual(movimiento.cantidad, 5)

    def test_reporte_faltante_genera_alerta(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/inventario/reportes-faltantes/', {
            'producto': self.producto.id,
            'descripcion': 'Llegaron 2 sacos rotos',
            'tipo': 'danio',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        reporte = ReporteFaltanteDanio.objects.get(pk=resp.data['id'])
        self.assertEqual(reporte.estado, ReporteFaltanteDanio.Estado.ABIERTO)

    def test_operaciones_no_puede_registrar_recepcion(self):
        solicitud = self._crear_solicitud(self.campo)
        self._autorizar(solicitud['id'])
        item_id = solicitud['items'][0]['id']
        self._enviar(solicitud['id'], item_id, self.operaciones)

        self._auth(self.operaciones)
        data = {
            'estado_general': 'completo',
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_recibida': '5.00', 'estado_item': 'ok'}]),
            'fotos_llegada': [_fake_foto('llegada.jpg')],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_campo_no_puede_registrar_envio(self):
        solicitud = self._crear_solicitud(self.campo)
        self._autorizar(solicitud['id'])
        item_id = solicitud['items'][0]['id']

        self._auth(self.campo)
        data = {
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_enviada': '5.00'}]),
            'fotos': [_fake_foto()],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/enviar/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_comparativo_solo_visible_para_roles_completos(self):
        solicitud = self._crear_solicitud(self.campo)
        self._autorizar(solicitud['id'])

        self._auth(self.campo)
        resp = self.client.get(f'/api/v1/inventario/solicitudes/{solicitud["id"]}/comparativo/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.inventario)
        resp = self.client.get(f'/api/v1/inventario/solicitudes/{solicitud["id"]}/comparativo/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
