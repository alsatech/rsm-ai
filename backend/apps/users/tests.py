from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class UserModelTest(TestCase):
    def test_crear_usuario_con_rol(self):
        user = User.objects.create_user(
            username='chino',
            password='clave12345',
            first_name='Chino',
            rol=User.Rol.CAMPO,
        )
        self.assertEqual(user.rol, User.Rol.CAMPO)
        self.assertTrue(user.check_password('clave12345'))

    def test_rol_por_defecto_es_campo(self):
        user = User.objects.create_user(username='nuevo', password='clave12345')
        self.assertEqual(user.rol, User.Rol.CAMPO)

    def test_str_incluye_rol(self):
        user = User.objects.create_user(
            username='alberto',
            password='clave12345',
            first_name='Alberto',
            last_name='Lebrija',
            rol=User.Rol.SUPERADMIN,
        )
        self.assertIn('Superadmin', str(user))


class AuthEndpointsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alberto',
            password='clave12345',
            first_name='Alberto',
            last_name='Lebrija',
            rol=User.Rol.SUPERADMIN,
        )

    def test_login_exitoso_regresa_tokens_nombre_y_rol(self):
        url = reverse('auth-login')
        response = self.client.post(url, {'username': 'alberto', 'password': 'clave12345'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['nombre'], 'Alberto Lebrija')
        self.assertEqual(response.data['rol'], User.Rol.SUPERADMIN)

    def test_login_credenciales_invalidas(self):
        url = reverse('auth-login')
        response = self.client.post(url, {'username': 'alberto', 'password': 'incorrecta'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requiere_autenticacion(self):
        url = reverse('auth-me')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_regresa_datos_del_usuario_autenticado(self):
        login_url = reverse('auth-login')
        login_response = self.client.post(login_url, {'username': 'alberto', 'password': 'clave12345'}, format='json')
        access_token = login_response.data['access']

        me_url = reverse('auth-me')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alberto')
        self.assertEqual(response.data['nombre'], 'Alberto Lebrija')
        self.assertEqual(response.data['rol'], User.Rol.SUPERADMIN)

    def test_refresh_token_genera_nuevo_access(self):
        login_url = reverse('auth-login')
        login_response = self.client.post(login_url, {'username': 'alberto', 'password': 'clave12345'}, format='json')
        refresh_token = login_response.data['refresh']

        refresh_url = reverse('auth-refresh')
        response = self.client.post(refresh_url, {'refresh': refresh_token}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
