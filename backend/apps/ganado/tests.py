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
