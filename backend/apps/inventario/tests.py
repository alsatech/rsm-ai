import datetime
import json

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import (
    CategoriaInventario,
    Compra,
    EnvioMaterial,
    ItemSolicitud,
    MovimientoInventario,
    Producto,
    RecepcionMaterial,
    RelacionCompras,
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


def _imagen_valida(nombre='factura.png'):
    """A diferencia de _fake_foto, produce bytes de imagen real — necesario para campos
    ImageField validados por el serializer (PIL revisa el contenido), no solo por el modelo."""
    import base64

    from django.core.files.uploadedfile import SimpleUploadedFile

    contenido = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    )
    return SimpleUploadedFile(nombre, contenido, content_type='image/png')


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


class ComprasYRelacionAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('chino_compra', 'campo')
        self.inventario = crear_usuario('yajaira_compra', 'inventario')
        self.operaciones = crear_usuario('erik_compra', 'operaciones')
        self.admin = crear_usuario('abigail_compra', 'administrador')
        self.superadmin = crear_usuario('alberto_compra', 'superadmin')
        self.producto = crear_producto(codigo='SM-CMP-001', stock_actual=10, stock_minimo=5)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_solicitud_autorizada(self, user=None):
        solicitante = user or self.campo
        self._auth(solicitante)
        payload = {
            'area': 'campo',
            'descripcion_necesidad': 'Material para bebederos',
            'estado': 'enviada',
            'items': [{'producto': self.producto.id, 'cantidad_solicitada': '5.00', 'unidad': 'pieza'}],
        }
        resp = self.client.post('/api/v1/inventario/solicitudes/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        solicitud = resp.data

        self._auth(self.admin)
        resp = self.client.post(f'/api/v1/inventario/solicitudes/{solicitud["id"]}/autorizar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        return solicitud

    def _registrar_compra(self, solicitud_id, registrador, comprador=None, monto='500.00', fecha=None):
        self._auth(registrador)
        data = {
            'comprado_por': (comprador or self.operaciones).id,
            'monto_total': monto,
            'foto_factura': _imagen_valida(),
        }
        if fecha:
            data['fecha_compra'] = fecha
        return self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud_id}/compra/', data, format='multipart',
        )

    def test_registrar_compra_cambia_estado_a_en_compra(self):
        solicitud = self._crear_solicitud_autorizada()
        resp = self._registrar_compra(solicitud['id'], self.inventario)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(resp.data['comprado_por'], self.operaciones.id)

        solicitud_db = SolicitudMaterial.objects.get(pk=solicitud['id'])
        self.assertEqual(solicitud_db.estado, SolicitudMaterial.Estado.EN_COMPRA)

    def test_no_se_puede_registrar_compra_dos_veces(self):
        solicitud = self._crear_solicitud_autorizada()
        resp = self._registrar_compra(solicitud['id'], self.inventario)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        resp = self._registrar_compra(solicitud['id'], self.inventario)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_campo_no_puede_registrar_compra(self):
        solicitud = self._crear_solicitud_autorizada()
        resp = self._registrar_compra(solicitud['id'], self.campo)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_se_puede_comprar_sin_autorizar(self):
        self._auth(self.campo)
        payload = {
            'area': 'campo',
            'descripcion_necesidad': 'Material para bebederos',
            'estado': 'enviada',
            'items': [{'producto': self.producto.id, 'cantidad_solicitada': '5.00', 'unidad': 'pieza'}],
        }
        resp = self.client.post('/api/v1/inventario/solicitudes/', payload, format='json')
        solicitud = resp.data

        resp = self._registrar_compra(solicitud['id'], self.inventario)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_relacion_compras_solo_incluye_compras_del_rango_sin_asignar(self):
        hoy = timezone.localdate()
        hace_10_dias = hoy - datetime.timedelta(days=10)

        solicitud_semana = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud_semana['id'], self.inventario, fecha=str(hoy))

        solicitud_vieja = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud_vieja['id'], self.inventario, fecha=str(hace_10_dias))

        self._auth(self.inventario)
        resp = self.client.post('/api/v1/inventario/relaciones-compras/', {
            'fecha_inicio': str(hoy - datetime.timedelta(days=3)),
            'fecha_fin': str(hoy),
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(len(resp.data['compras']), 1)
        self.assertEqual(resp.data['compras'][0]['solicitud'], solicitud_semana['id'])
        self.assertEqual(resp.data['estado'], 'borrador')

    def test_relacion_compras_sin_compras_en_rango_falla(self):
        self._auth(self.inventario)
        resp = self.client.post('/api/v1/inventario/relaciones-compras/', {
            'fecha_inicio': '2020-01-01',
            'fecha_fin': '2020-01-07',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_administrador_no_puede_generar_relacion_pero_si_verla(self):
        solicitud = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud['id'], self.inventario)

        hoy = str(timezone.localdate())
        self._auth(self.admin)
        resp = self.client.post('/api/v1/inventario/relaciones-compras/', {
            'fecha_inicio': hoy, 'fecha_fin': hoy,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.inventario)
        resp = self.client.post('/api/v1/inventario/relaciones-compras/', {
            'fecha_inicio': hoy, 'fecha_fin': hoy,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        self._auth(self.admin)
        resp = self.client.get('/api/v1/inventario/relaciones-compras/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_enviar_relacion_compras_marca_estado_y_no_se_puede_reenviar(self):
        solicitud = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud['id'], self.inventario)

        hoy = str(timezone.localdate())
        self._auth(self.inventario)
        resp = self.client.post('/api/v1/inventario/relaciones-compras/', {
            'fecha_inicio': hoy, 'fecha_fin': hoy,
        }, format='json')
        relacion_id = resp.data['id']

        resp = self.client.post(f'/api/v1/inventario/relaciones-compras/{relacion_id}/enviar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['estado'], 'enviada')
        self.assertIsNotNone(RelacionCompras.objects.get(pk=relacion_id).enviada_en)

        resp = self.client.post(f'/api/v1/inventario/relaciones-compras/{relacion_id}/enviar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class CompraDesdeMovimientoAPITest(APITestCase):
    """La entrada directa por '+ Movimiento' también puede generar una Compra (sin pasar por
    Solicitud/Autorización), para que alimente la Relación de compras semanal."""

    def setUp(self):
        self.inventario = crear_usuario('yajaira_mov', 'inventario')
        self.operaciones = crear_usuario('erik_mov', 'operaciones')
        self.campo = crear_usuario('chino_mov', 'campo')
        self.producto = crear_producto(codigo='SM-MOV-001', stock_actual=10, stock_minimo=5)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _entrada_compra(self, **overrides):
        data = {
            'producto': self.producto.id,
            'tipo': 'entrada',
            'cantidad': '5.00',
            'monto_compra': '350.00',
            'comprado_por': self.operaciones.id,
            'foto_evidencia': _imagen_valida(),
        }
        data.update(overrides)
        return self.client.post('/api/v1/inventario/movimientos/', data, format='multipart')

    def test_entrada_con_monto_crea_compra_ligada_al_movimiento(self):
        self._auth(self.inventario)
        resp = self._entrada_compra()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertIsNotNone(resp.data['compra'])
        self.assertEqual(resp.data['compra']['monto_total'], '350.00')
        self.assertIsNone(resp.data['compra']['solicitud'])

        compra = Compra.objects.get(movimiento_id=resp.data['id'])
        self.assertEqual(compra.comprado_por_id, self.operaciones.id)
        self.assertEqual(compra.registrado_por_id, self.inventario.id)

    def test_entrada_sin_monto_no_crea_compra(self):
        self._auth(self.inventario)
        resp = self.client.post('/api/v1/inventario/movimientos/', {
            'producto': self.producto.id, 'tipo': 'entrada', 'cantidad': '5.00',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertIsNone(resp.data['compra'])
        self.assertFalse(Compra.objects.filter(movimiento_id=resp.data['id']).exists())

    def test_entrada_con_monto_sin_foto_falla(self):
        self._auth(self.inventario)
        resp = self._entrada_compra(foto_evidencia='')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('foto_evidencia', resp.data)

    def test_entrada_con_monto_sin_comprador_falla(self):
        self._auth(self.inventario)
        resp = self._entrada_compra(comprado_por='')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('comprado_por', resp.data)

    def test_salida_con_monto_falla(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/inventario/movimientos/', {
            'producto': self.producto.id, 'tipo': 'salida', 'cantidad': '2.00', 'monto_compra': '100.00',
            'comprado_por': self.operaciones.id, 'foto_evidencia': _imagen_valida(),
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('monto_compra', resp.data)

    def test_relacion_compras_junta_compras_de_solicitud_y_de_movimiento(self):
        # una compra vía Adquisiciones
        self._auth(self.campo)
        payload = {
            'area': 'campo', 'descripcion_necesidad': 'Material', 'estado': 'enviada',
            'items': [{'producto': self.producto.id, 'cantidad_solicitada': '5.00', 'unidad': 'pieza'}],
        }
        resp = self.client.post('/api/v1/inventario/solicitudes/', payload, format='json')
        solicitud_id = resp.data['id']

        admin = crear_usuario('abigail_mov', 'administrador')
        self._auth(admin)
        self.client.post(f'/api/v1/inventario/solicitudes/{solicitud_id}/autorizar/', {}, format='json')

        self._auth(self.inventario)
        self.client.post(f'/api/v1/inventario/solicitudes/{solicitud_id}/compra/', {
            'comprado_por': self.operaciones.id, 'monto_total': '200.00', 'foto_factura': _imagen_valida(),
        }, format='multipart')

        # una compra vía entrada directa
        self._entrada_compra()

        hoy = str(timezone.localdate())
        resp = self.client.post('/api/v1/inventario/relaciones-compras/', {
            'fecha_inicio': hoy, 'fecha_fin': hoy,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(len(resp.data['compras']), 2)
        origenes = {c['solicitud_folio'] for c in resp.data['compras']}
        self.assertIn(None, origenes)  # la de movimiento no tiene folio de solicitud
