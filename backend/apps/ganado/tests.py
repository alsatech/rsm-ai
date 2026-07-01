import io

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import Corraleta, FotoRecorrido, ParadaRecorrido, RecorridoGanado

TOTAL_CORRALETAS = 27


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


def crear_corraleta(nombre, lat=29.5, lng=-101.5):
    return Corraleta.objects.create(nombre=nombre, lat=lat, lng=lng)


def crear_recorrido(responsable, corraleta1=None, corraleta2=None):
    c1 = corraleta1 or crear_corraleta('C-A')
    c2 = corraleta2 or crear_corraleta('C-B', lat=29.6)
    r = RecorridoGanado.objects.create(
        fecha='2026-06-26',
        responsable=responsable,
        estado_hato='bien',
        color='azul_claro',
        narrativa='Recorrido de prueba',
        created_by=responsable,
    )
    ParadaRecorrido.objects.create(recorrido=r, corraleta=c1, orden=1)
    ParadaRecorrido.objects.create(recorrido=r, corraleta=c2, orden=2)
    return r


class CorraletasPrecargadasTest(TestCase):
    def test_corraletas_precargadas_existen(self):
        self.assertEqual(Corraleta.objects.count(), TOTAL_CORRALETAS)


class RecorridoModelTest(TestCase):
    def setUp(self):
        self.campo = crear_usuario('chino_test', 'campo')
        self.c1 = crear_corraleta('X1')
        self.c2 = crear_corraleta('X2', lat=29.6)

    def test_crear_recorrido_con_paradas_ordenadas(self):
        r = RecorridoGanado.objects.create(
            fecha='2026-06-26',
            responsable=self.campo,
            estado_hato='bien',
            color='verde',
            narrativa='Test orden',
            created_by=self.campo,
        )
        ParadaRecorrido.objects.create(recorrido=r, corraleta=self.c1, orden=1)
        ParadaRecorrido.objects.create(recorrido=r, corraleta=self.c2, orden=2)
        paradas = list(r.paradas.all())
        self.assertEqual(len(paradas), 2)
        self.assertEqual(paradas[0].orden, 1)
        self.assertEqual(paradas[1].orden, 2)


class RecorridoAPITest(APITestCase):
    def setUp(self):
        self.campo1 = crear_usuario('campo_uno', 'campo')
        self.campo2 = crear_usuario('campo_dos', 'campo')
        self.admin = crear_usuario('admin_test', 'administrador')
        self.c1 = crear_corraleta('API-C1')
        self.c2 = crear_corraleta('API-C2', lat=29.6)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def test_campo_solo_ve_sus_recorridos(self):
        r1 = crear_recorrido(self.campo1, self.c1, self.c2)
        crear_recorrido(self.campo2, self.c1, self.c2)
        self._auth(self.campo1)
        resp = self.client.get('/api/v1/ganado/recorridos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in resp.data]
        self.assertIn(r1.id, ids)
        self.assertEqual(len(ids), 1)

    def test_administrador_ve_todos(self):
        crear_recorrido(self.campo1, self.c1, self.c2)
        crear_recorrido(self.campo2, self.c1, self.c2)
        self._auth(self.admin)
        resp = self.client.get('/api/v1/ganado/recorridos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_crear_recorrido_requiere_2_paradas(self):
        self._auth(self.campo1)
        data = {
            'fecha': '2026-06-26',
            'responsable': self.campo1.id,
            'estado_hato': 'bien',
            'color': 'azul_claro',
            'narrativa': 'Test',
            'paradas': [{'corraleta': self.c1.id, 'orden': 1}],
        }
        resp = self.client.post('/api/v1/ganado/recorridos/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crear_recorrido_exitoso(self):
        self._auth(self.campo1)
        data = {
            'fecha': '2026-06-26',
            'responsable': self.campo1.id,
            'estado_hato': 'bien',
            'color': 'verde',
            'narrativa': 'Salieron de los corrales nuevos',
            'paradas': [
                {'corraleta': self.c1.id, 'orden': 1},
                {'corraleta': self.c2.id, 'orden': 2},
            ],
        }
        resp = self.client.post('/api/v1/ganado/recorridos/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_crear_recorrido_sin_responsable_usa_usuario_actual(self):
        """Caso real: frontend no envía responsable porque user.id no está en el perfil localStorage."""
        self._auth(self.campo1)
        data = {
            'fecha': '2026-06-26',
            # sin 'responsable' — simula el bug del frontend
            'estado_hato': 'bien',
            'color': 'azul_claro',
            'narrativa': 'Test sin responsable explícito',
            'paradas': [
                {'corraleta': self.c1.id, 'orden': 1},
                {'corraleta': self.c2.id, 'orden': 2},
            ],
        }
        resp = self.client.post('/api/v1/ganado/recorridos/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        recorrido = RecorridoGanado.objects.get(pk=resp.data['id'])
        self.assertEqual(recorrido.responsable, self.campo1)

    def test_maximo_4_fotos(self):
        from PIL import Image

        r = crear_recorrido(self.campo1, self.c1, self.c2)
        self._auth(self.campo1)
        url = f'/api/v1/ganado/recorridos/{r.id}/fotos/'

        def make_img():
            img = Image.new('RGB', (10, 10), color='green')
            buf = io.BytesIO()
            img.save(buf, format='JPEG')
            buf.seek(0)
            buf.name = 'test.jpg'
            return buf

        for _ in range(4):
            resp = self.client.post(url, {'foto': make_img()}, format='multipart')
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        resp = self.client.post(url, {'foto': make_img()}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_campo_asistente_ve_recorrido(self):
        r = crear_recorrido(self.campo1, self.c1, self.c2)
        r.asistentes.add(self.campo2)
        self._auth(self.campo2)
        resp = self.client.get('/api/v1/ganado/recorridos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in resp.data]
        self.assertIn(r.id, ids)


class IniciarFinalizarAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('campo_flow', 'campo')
        self.c1 = crear_corraleta('Flow-C1')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_en_curso(self):
        return RecorridoGanado.objects.create(
            fecha='2026-06-27',
            responsable=self.campo,
            created_by=self.campo,
            color='verde',
        )

    def test_iniciar_recorrido_crea_en_curso(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/ganado/recorridos/iniciar/',
            {'fecha': '2026-06-27', 'color': 'verde'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['estado'], 'en_curso')

    def test_agregar_parada_con_corraleta(self):
        self._auth(self.campo)
        rec = self._crear_en_curso()
        resp = self.client.post(
            f'/api/v1/ganado/recorridos/{rec.id}/agregar-parada/',
            {'corraleta': self.c1.id},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['orden'], 1)

    def test_agregar_parada_con_nombre_libre(self):
        self._auth(self.campo)
        rec = self._crear_en_curso()
        resp = self.client.post(
            f'/api/v1/ganado/recorridos/{rec.id}/agregar-parada/',
            {'nombre_libre': 'La lomita del aguaje', 'lat': '29.520', 'lng': '-101.555'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['nombre_libre'], 'La lomita del aguaje')

    def test_parada_sin_corraleta_ni_nombre_libre_falla(self):
        self._auth(self.campo)
        rec = self._crear_en_curso()
        resp = self.client.post(
            f'/api/v1/ganado/recorridos/{rec.id}/agregar-parada/',
            {},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_finalizar_cambia_estado_y_hora_fin(self):
        self._auth(self.campo)
        rec = self._crear_en_curso()
        resp = self.client.patch(
            f'/api/v1/ganado/recorridos/{rec.id}/finalizar/',
            {'estado_hato': 'bien', 'narrativa': 'Todo bien en el rancho.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rec.refresh_from_db()
        self.assertEqual(rec.estado, RecorridoGanado.Estado.FINALIZADO)
        self.assertIsNotNone(rec.hora_fin)


class SyncParadasAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('sync_campo', 'campo')
        self.otro_campo = crear_usuario('sync_otro', 'campo')
        self.admin = crear_usuario('sync_admin', 'administrador')
        self.c1 = crear_corraleta('Sync-C1')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_en_curso(self, responsable=None):
        return RecorridoGanado.objects.create(
            fecha='2026-06-27',
            responsable=responsable or self.campo,
            created_by=responsable or self.campo,
            color='verde',
        )

    def test_sync_paradas_reemplaza_existentes(self):
        rec = self._crear_en_curso()
        ParadaRecorrido.objects.create(recorrido=rec, nombre_libre='Vieja', orden=1)
        self._auth(self.campo)
        body = {
            'paradas': [
                {'orden': 1, 'corraleta_id': self.c1.id, 'timestamp': '2026-06-27T09:15:00Z'},
                {
                    'orden': 2,
                    'nombre_libre': 'Orilla de la cerca del 3A',
                    'lat': '29.521', 'lng': '-101.566',
                    'timestamp': '2026-06-27T11:30:00Z',
                },
            ],
        }
        resp = self.client.post(
            f'/api/v1/ganado/recorridos/{rec.id}/sync-paradas/', body, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rec.refresh_from_db()
        paradas = list(rec.paradas.all())
        self.assertEqual(len(paradas), 2)
        self.assertEqual(paradas[0].corraleta_id, self.c1.id)
        self.assertEqual(paradas[1].nombre_libre, 'Orilla de la cerca del 3A')
        self.assertIsNotNone(paradas[0].hora_llegada)

    def test_sync_solo_responsable_o_admin(self):
        rec = self._crear_en_curso()
        body = {'paradas': [{'orden': 1, 'corraleta_id': self.c1.id, 'timestamp': '2026-06-27T09:15:00Z'}]}

        self._auth(self.otro_campo)
        resp = self.client.post(
            f'/api/v1/ganado/recorridos/{rec.id}/sync-paradas/', body, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.admin)
        resp = self.client.post(
            f'/api/v1/ganado/recorridos/{rec.id}/sync-paradas/', body, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class HeatmapPastoreoAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('heat_campo', 'campo')
        self.admin = crear_usuario('heat_admin', 'administrador')
        self.c1 = crear_corraleta('Heat-C1', lat=29.5, lng=-101.5)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_finalizado(self, fecha):
        rec = RecorridoGanado.objects.create(
            fecha=fecha,
            responsable=self.campo,
            created_by=self.campo,
            estado=RecorridoGanado.Estado.FINALIZADO,
            estado_hato='bien',
            narrativa='ok',
            color='verde',
        )
        ParadaRecorrido.objects.create(recorrido=rec, corraleta=self.c1, orden=1)
        ParadaRecorrido.objects.create(recorrido=rec, nombre_libre='Libre', lat='29.510', lng='-101.510', orden=2)
        return rec

    def test_heatmap_retorna_coordenadas_con_peso(self):
        self._crear_finalizado('2026-06-20')
        self._crear_finalizado('2026-06-21')
        self._auth(self.admin)
        resp = self.client.get('/api/v1/ganado/heatmap/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        total_peso = sum(p['weight'] for p in resp.data)
        self.assertEqual(total_peso, 4)
        corraleta_bucket = next(p for p in resp.data if p['weight'] >= 2)
        self.assertEqual(corraleta_bucket['weight'], 2)

    def test_heatmap_filtra_por_fecha(self):
        self._crear_finalizado('2026-06-01')
        self._crear_finalizado('2026-06-25')
        self._auth(self.admin)
        resp = self.client.get('/api/v1/ganado/heatmap/', {'fecha_desde': '2026-06-20'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        total_peso = sum(p['weight'] for p in resp.data)
        self.assertEqual(total_peso, 2)

    def test_heatmap_requiere_admin(self):
        self._crear_finalizado('2026-06-20')
        self._auth(self.campo)
        resp = self.client.get('/api/v1/ganado/heatmap/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_heatmap_no_infla_peso_por_paradas_vecinas_del_mismo_recorrido(self):
        """Una ruta nueva con varias paradas cercanas en una sola salida cuenta como 1 visita por celda."""
        c2 = crear_corraleta('Heat-C2', lat=29.7, lng=-101.7)
        c3 = crear_corraleta('Heat-C3', lat=29.7001, lng=-101.7001)
        rec = RecorridoGanado.objects.create(
            fecha='2026-06-22',
            responsable=self.campo,
            created_by=self.campo,
            estado=RecorridoGanado.Estado.FINALIZADO,
            estado_hato='bien',
            narrativa='primera vez en esta ruta',
            color='verde',
        )
        ParadaRecorrido.objects.create(recorrido=rec, corraleta=c2, orden=1)
        ParadaRecorrido.objects.create(recorrido=rec, corraleta=c3, orden=2)
        self._auth(self.admin)
        resp = self.client.get('/api/v1/ganado/heatmap/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        bucket_nuevo = next(p for p in resp.data if round(p['lat'], 3) == 29.7)
        self.assertEqual(bucket_nuevo['weight'], 1)
