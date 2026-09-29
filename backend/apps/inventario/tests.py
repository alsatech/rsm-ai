import datetime
import json
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .clasificacion_abc import calcular_clasificacion_abc
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


def crear_movimiento_salida(producto, responsable, fecha=None, validado=True, rechazado=False):
    return MovimientoInventario.objects.create(
        producto=producto,
        tipo=MovimientoInventario.Tipo.SALIDA,
        cantidad='1.00',
        stock_anterior=producto.stock_actual,
        stock_resultante=producto.stock_actual,
        responsable=responsable,
        fecha_movimiento=fecha or timezone.localdate(),
        validado=validado,
        rechazado=rechazado,
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

    def test_entrada_por_movimiento_ya_no_se_permite(self):
        # Las entradas solo se registran a través de una solicitud de material en Adquisiciones
        # (ver DarEntradaRecepcionView) — ningún rol puede crear una 'entrada' desde +Movimiento.
        self._auth(self.inventario)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='entrada', cantidad='5.00'), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)

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

    def test_yajaira_puede_cancelar_salida(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 7)

        self._auth(self.inventario)
        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/cancelar/',
            {'nota': 'Se capturó el producto equivocado'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['rechazado'])
        self.assertEqual(resp.data['validado_por'], self.inventario.id)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)

    def test_campo_no_puede_cancelar_salida(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']

        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/cancelar/', {'nota': 'Error mío'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_no_puede_cancelar_salida(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']

        self._auth(self.admin)
        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/cancelar/', {'nota': 'Error'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancelar_requiere_nota(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']

        self._auth(self.inventario)
        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/cancelar/', {}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_se_puede_cancelar_salida_dos_veces(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='3.00'), format='json',
        )
        movimiento_id = resp.data['id']

        self._auth(self.inventario)
        url = f'/api/v1/inventario/movimientos/{movimiento_id}/cancelar/'
        resp = self.client.patch(url, {'nota': 'Error'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        resp = self.client.patch(url, {'nota': 'Otra vez'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_se_puede_cancelar_una_entrada(self):
        # Las entradas (siempre vía Adquisiciones) no pasan por este flujo de cancelación.
        entrada = MovimientoInventario.objects.create(
            producto=self.producto,
            tipo=MovimientoInventario.Tipo.ENTRADA,
            cantidad=5,
            stock_anterior=10,
            stock_resultante=15,
            responsable=self.inventario,
            validado=True,
            validado_por=self.inventario,
        )

        self._auth(self.inventario)
        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{entrada.id}/cancelar/', {'nota': 'Error'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_yajaira_puede_agregar_observaciones_sin_afectar_stock(self):
        # PATCH directo a /movimientos/{id}/ para agregar una nota — no debe revalidar el
        # stock (que puede haber bajado por movimientos posteriores) porque no se toca 'cantidad'.
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='9.00'), format='json',
        )
        movimiento_id = resp.data['id']
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 1)

        self._auth(self.inventario)
        resp = self.client.patch(
            f'/api/v1/inventario/movimientos/{movimiento_id}/', {'notas': 'Revisado, todo en orden'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['notas'], 'Revisado, todo en orden')

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
            '/api/v1/inventario/movimientos/', self._movimiento_data(tipo='salida', cantidad='1.00'), format='json',
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

    def test_reporte_diario_requiere_permiso(self):
        self._auth(self.campo)
        resp = self.client.get('/api/v1/inventario/reporte-diario/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_reporte_diario_genera_pdf(self):
        self._auth(self.inventario)
        resp = self.client.get('/api/v1/inventario/reporte-diario/', {'fecha': '2026-08-26'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertIn('reporte_inventario_2026-08-26.pdf', resp['Content-Disposition'])
        self.assertTrue(resp.content.startswith(b'%PDF'))

    def test_todos_los_roles_ven_productos(self):
        for user in (self.campo, self.inventario, self.operaciones, self.admin, self.superadmin):
            self._auth(user)
            resp = self.client.get('/api/v1/inventario/productos/')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)


def _fake_foto(nombre='evidencia.jpg'):
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(nombre, b'contenido-fake-de-imagen', content_type='image/jpeg')


def _fake_audio(nombre='nota.webm'):
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(nombre, b'contenido-fake-de-audio', content_type='audio/webm')


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

    def test_filtro_estado_acepta_lista_separada_por_comas(self):
        # La pantalla de recepción de Campo necesita ver 'enviada_rancho' y 'recibida_parcial'
        # a la vez, así que el filtro ?estado= acepta varios valores separados por coma.
        s1 = self._crear_solicitud(self.campo)  # queda en 'autorizada'
        s2 = self._crear_solicitud(self.campo)
        item2_id = s2['items'][0]['id']
        self._enviar(s2['id'], item2_id, self.operaciones)  # pasa a 'enviada_rancho'

        self._auth(self.campo)
        resp = self.client.get('/api/v1/inventario/solicitudes/?estado=autorizada,enviada_rancho')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {s['id'] for s in resp.data}
        self.assertIn(s1['id'], ids)
        self.assertIn(s2['id'], ids)

        resp = self.client.get('/api/v1/inventario/solicitudes/?estado=enviada_rancho')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {s['id'] for s in resp.data}
        self.assertNotIn(s1['id'], ids)
        self.assertIn(s2['id'], ids)

    def test_solicitud_enviada_queda_lista_para_compra_sin_autorizacion_manual(self):
        # Las solicitudes de material ya no pasan por autorización manual: la coordinación es
        # comunicación directa entre solicitante y quien captura, así que quedan listas para
        # compra de inmediato (el endpoint /autorizar/ queda solo para solicitudes legacy).
        solicitud = self._crear_solicitud(self.campo)
        self.assertEqual(solicitud['estado'], 'autorizada')
        self.assertIsNone(solicitud['autorizado_por'])

        self._auth(self.admin)
        resp = self.client.post(f'/api/v1/inventario/solicitudes/{solicitud["id"]}/autorizar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recibido_por_distinto_enviado_por(self):
        # se usa administrador como enviador porque es el único rol que puede enviar Y recibir,
        # para aislar la regla de "distinto usuario" de la regla de permisos por rol.
        solicitud = self._crear_solicitud(self.campo)
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

    def _crear_recepcion_completa(self, cantidad='5.00'):
        """Crea solicitud → envío → recepción completa. Ya NO mueve stock — eso lo hace
        DarEntradaRecepcionView cuando Yajaira lo confirma."""
        solicitud = self._crear_solicitud(self.campo, cantidad=cantidad)
        item_id = solicitud['items'][0]['id']
        self._enviar(solicitud['id'], item_id, self.operaciones, cantidad=cantidad)

        self._auth(self.campo)
        data = {
            'estado_general': 'completo',
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_recibida': cantidad, 'estado_item': 'ok'}]),
            'fotos_llegada': [_fake_foto('llegada.jpg')],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        return solicitud, resp.data

    def test_recepcion_no_mueve_stock_todavia(self):
        stock_antes = self.producto.stock_actual
        solicitud, _ = self._crear_recepcion_completa(cantidad='5.00')

        solicitud_db = SolicitudMaterial.objects.get(pk=solicitud['id'])
        self.assertEqual(solicitud_db.estado, SolicitudMaterial.Estado.RECIBIDA_COMPLETA)

        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, stock_antes)
        self.assertFalse(
            MovimientoInventario.objects.filter(producto=self.producto, tipo=MovimientoInventario.Tipo.ENTRADA).exists()
        )

    def test_dar_entrada_genera_movimiento_ligado_a_la_solicitud(self):
        stock_antes = self.producto.stock_actual
        solicitud, recepcion = self._crear_recepcion_completa(cantidad='5.00')

        self._auth(self.inventario)
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/{recepcion["id"]}/dar-entrada/',
            {}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertTrue(resp.data['entrada_confirmada'])
        self.assertEqual(resp.data['entrada_confirmada_por'], self.inventario.id)

        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, stock_antes + 5)

        movimiento = MovimientoInventario.objects.filter(
            producto=self.producto, tipo=MovimientoInventario.Tipo.ENTRADA,
        ).latest('fecha_hora_registro')
        self.assertEqual(movimiento.cantidad, 5)
        self.assertEqual(movimiento.solicitud_id, solicitud['id'])
        self.assertTrue(movimiento.validado)
        self.assertEqual(movimiento.validado_por_id, self.inventario.id)

    def test_dar_entrada_dos_veces_falla(self):
        solicitud, recepcion = self._crear_recepcion_completa(cantidad='5.00')

        self._auth(self.inventario)
        url = f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/{recepcion["id"]}/dar-entrada/'
        resp = self.client.post(url, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        resp = self.client.post(url, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_campo_no_puede_dar_entrada(self):
        solicitud, recepcion = self._crear_recepcion_completa(cantidad='5.00')

        self._auth(self.campo)
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/{recepcion["id"]}/dar-entrada/',
            {}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_recepcion_con_nota_de_voz_se_guarda(self):
        solicitud = self._crear_solicitud(self.campo, cantidad='5.00')
        item_id = solicitud['items'][0]['id']
        self._enviar(solicitud['id'], item_id, self.operaciones, cantidad='5.00')

        self._auth(self.campo)
        data = {
            'estado_general': 'completo',
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_recibida': '5.00', 'estado_item': 'ok'}]),
            'fotos_llegada': [_fake_foto('llegada.jpg')],
            'audio': _fake_audio(),
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertTrue(resp.data['audio'])

    def test_recepcion_con_audio_formato_invalido_falla(self):
        solicitud = self._crear_solicitud(self.campo, cantidad='5.00')
        item_id = solicitud['items'][0]['id']
        self._enviar(solicitud['id'], item_id, self.operaciones, cantidad='5.00')

        self._auth(self.campo)
        data = {
            'estado_general': 'completo',
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_recibida': '5.00', 'estado_item': 'ok'}]),
            'fotos_llegada': [_fake_foto('llegada.jpg')],
            'audio': _fake_audio('nota.exe'),
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/recepciones/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('audio', resp.data)

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
        return resp.data

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

    def _actualizar_compra(self, solicitud_id, registrador, **overrides):
        self._auth(registrador)
        return self.client.patch(
            f'/api/v1/inventario/solicitudes/{solicitud_id}/compra/', overrides, format='multipart',
        )

    def test_editar_compra_corrige_monto_antes_de_enviar(self):
        solicitud = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud['id'], self.inventario, monto='500.00')

        resp = self._actualizar_compra(solicitud['id'], self.inventario, monto_total='650.00')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['monto_total'], '650.00')

        compra = Compra.objects.get(solicitud_id=solicitud['id'])
        self.assertEqual(str(compra.monto_total), '650.00')

    def test_campo_no_puede_editar_compra(self):
        solicitud = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud['id'], self.inventario)

        resp = self._actualizar_compra(solicitud['id'], self.campo, monto_total='999.00')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_se_puede_editar_compra_sin_registrar(self):
        solicitud = self._crear_solicitud_autorizada()
        resp = self._actualizar_compra(solicitud['id'], self.inventario, monto_total='999.00')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_se_puede_editar_compra_despues_de_registrar_envio(self):
        solicitud = self._crear_solicitud_autorizada()
        self._registrar_compra(solicitud['id'], self.inventario)

        item_id = solicitud['items'][0]['id']
        self._auth(self.operaciones)
        data = {
            'items': json.dumps([{'item_solicitud': item_id, 'cantidad_enviada': '5.00'}]),
            'vehiculo': 'Sierra',
            'fotos': [_fake_foto()],
        }
        resp = self.client.post(
            f'/api/v1/inventario/solicitudes/{solicitud["id"]}/enviar/', data, format='multipart',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        resp = self._actualizar_compra(solicitud['id'], self.inventario, monto_total='999.00')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_se_puede_comprar_una_solicitud_en_borrador(self):
        self._auth(self.campo)
        payload = {
            'area': 'campo',
            'descripcion_necesidad': 'Material para bebederos',
            'estado': 'borrador',
            'items': [{'producto': self.producto.id, 'cantidad_solicitada': '5.00', 'unidad': 'pieza'}],
        }
        resp = self.client.post('/api/v1/inventario/solicitudes/', payload, format='json')
        solicitud = resp.data
        self.assertEqual(solicitud['estado'], 'borrador')

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


class ClasificacionABCCalculoTest(TestCase):
    """Prueba la función de cálculo directamente, aislando el catálogo precargado
    (121 productos, ver migración 0003) con querysets explícitos por código."""

    def setUp(self):
        self.usuario = crear_usuario('yajaira_abc_calc_test', 'inventario')

    def test_score_y_clase_con_valores_conocidos(self):
        # Sin salidas registradas -> frecuencia normalizada = 0 para los 3, el score
        # depende solo de valor económico (40%) y criticidad (20%).
        p1 = crear_producto(codigo='SM-ABC-001', stock_actual=100, stock_minimo=0)
        p1.costo_unitario = Decimal('1000.00')
        p1.criticidad = Producto.Criticidad.ALTA
        p1.save()

        p2 = crear_producto(codigo='SM-ABC-002', stock_actual=10, stock_minimo=0)
        p2.costo_unitario = Decimal('100.00')
        p2.criticidad = Producto.Criticidad.MEDIA
        p2.save()

        p3 = crear_producto(codigo='SM-ABC-003', stock_actual=1, stock_minimo=0)
        p3.costo_unitario = Decimal('1.00')
        p3.criticidad = Producto.Criticidad.BAJA
        p3.save()

        qs = Producto.objects.filter(codigo__in=['SM-ABC-001', 'SM-ABC-002', 'SM-ABC-003'])
        resultado = calcular_clasificacion_abc(productos_qs=qs)
        self.assertEqual(len(resultado), 3)

        p1.refresh_from_db()
        p2.refresh_from_db()
        p3.refresh_from_db()

        # Cumulativo esperado: P1 78.5% (<=80 -> A), P1+P2 94.8% (<=95 -> B), total 100% (-> C)
        self.assertEqual(p1.clase_abc, 'A')
        self.assertEqual(p1.score_abc, Decimal('60.00'))
        self.assertEqual(p2.clase_abc, 'B')
        self.assertEqual(p2.score_abc, Decimal('12.40'))
        self.assertEqual(p3.clase_abc, 'C')
        self.assertEqual(p3.score_abc, Decimal('4.00'))
        self.assertIsNotNone(p1.clasificado_en)

    def test_catalogo_vacio_no_falla(self):
        resultado = calcular_clasificacion_abc(productos_qs=Producto.objects.none())
        self.assertEqual(resultado, [])

    def test_sin_variacion_de_valor_no_causa_division_por_cero(self):
        # Todo el catalogo (aislado) en costo_unitario=0 y stock_actual=0 -> maximo_valor
        # del catalogo es 0, y sin movimientos maximo_frecuencia tambien es 0.
        crear_producto(codigo='SM-ABC-010', stock_actual=0, stock_minimo=0)
        crear_producto(codigo='SM-ABC-011', stock_actual=0, stock_minimo=0)

        qs = Producto.objects.filter(codigo__in=['SM-ABC-010', 'SM-ABC-011'])
        resultado = calcular_clasificacion_abc(productos_qs=qs)

        self.assertEqual(len(resultado), 2)
        for producto in resultado:
            self.assertIn(producto.clase_abc, ['A', 'B', 'C'])
            self.assertIsNotNone(producto.score_abc)

    def test_frecuencia_solo_cuenta_salidas_validadas_no_rechazadas_ultimos_30_dias(self):
        p_dentro = crear_producto(codigo='SM-ABC-020', stock_actual=5, stock_minimo=0)
        p_fuera = crear_producto(codigo='SM-ABC-021', stock_actual=5, stock_minimo=0)
        hoy = timezone.localdate()

        for _ in range(5):
            crear_movimiento_salida(p_dentro, self.usuario, fecha=hoy)
        crear_movimiento_salida(p_dentro, self.usuario, fecha=hoy - datetime.timedelta(days=31))  # fuera de ventana
        crear_movimiento_salida(p_dentro, self.usuario, fecha=hoy, validado=False)  # no validada
        crear_movimiento_salida(p_dentro, self.usuario, fecha=hoy, rechazado=True)  # rechazada

        qs = Producto.objects.filter(codigo__in=['SM-ABC-020', 'SM-ABC-021'])
        calcular_clasificacion_abc(productos_qs=qs)

        p_dentro.refresh_from_db()
        p_fuera.refresh_from_db()
        self.assertGreater(p_dentro.score_abc, p_fuera.score_abc)


class ClasificacionABCAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('chino_abc_api_test', 'campo')
        self.inventario = crear_usuario('yajaira_abc_api_test', 'inventario')
        self.operaciones = crear_usuario('erik_abc_api_test', 'operaciones')
        self.producto = crear_producto(codigo='SM-ABC-100')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def test_operaciones_puede_recalcular(self):
        self._auth(self.operaciones)
        resp = self.client.post('/api/v1/inventario/productos/clasificacion-abc/recalcular/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_campo_no_puede_recalcular(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/inventario/productos/clasificacion-abc/recalcular/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_recalculo_persiste_clase_score_y_fecha_sin_recalcular_en_cada_get(self):
        self._auth(self.inventario)
        resp = self.client.post('/api/v1/inventario/productos/clasificacion-abc/recalcular/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.producto.refresh_from_db()
        self.assertIsNotNone(self.producto.clase_abc)
        self.assertIsNotNone(self.producto.score_abc)
        self.assertIsNotNone(self.producto.clasificado_en)

        resp = self.client.get(f'/api/v1/inventario/productos/{self.producto.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['clase_abc'], self.producto.clase_abc)
        self.assertEqual(resp.data['score_abc'], str(self.producto.score_abc))

    def test_operaciones_puede_editar_costo_y_criticidad(self):
        self._auth(self.operaciones)
        resp = self.client.patch(
            f'/api/v1/inventario/productos/{self.producto.id}/',
            {'costo_unitario': '50.00', 'criticidad': 'alta'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.costo_unitario, Decimal('50.00'))
        self.assertEqual(self.producto.criticidad, 'alta')

    def test_operaciones_no_puede_editar_otros_campos_del_catalogo(self):
        self._auth(self.operaciones)
        resp = self.client.patch(
            f'/api/v1/inventario/productos/{self.producto.id}/',
            {'descripcion': 'Cambiado por operaciones'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_operaciones_no_puede_mezclar_campos_abc_con_catalogo_general(self):
        self._auth(self.operaciones)
        resp = self.client.patch(
            f'/api/v1/inventario/productos/{self.producto.id}/',
            {'costo_unitario': '50.00', 'descripcion': 'Cambiado'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
