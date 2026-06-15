from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User

from .models import RegistroHidraulico


class RegistroHidraulicoModelTest(TestCase):
    def setUp(self):
        self.campo = User.objects.create_user(username='chino', password='clave12345', rol=User.Rol.CAMPO)

    def test_str_incluye_punto_y_estado(self):
        registro = RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PILA_NORTE_1,
            estado=RegistroHidraulico.Estado.NORMAL,
            created_by=self.campo,
        )
        self.assertIn('Pila Norte 1', str(registro))
        self.assertIn('Normal', str(registro))

    def test_validado_por_defecto_es_falso(self):
        registro = RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PLUVIOMETRO_1,
            estado=RegistroHidraulico.Estado.NORMAL,
            lluvia_mm='12.50',
            created_by=self.campo,
        )
        self.assertFalse(registro.validado)
        self.assertIsNone(registro.validado_por)


class RegistroHidraulicoEndpointTest(APITestCase):
    def setUp(self):
        self.campo = User.objects.create_user(username='chino', password='clave12345', rol=User.Rol.CAMPO)
        self.otro_campo = User.objects.create_user(username='beto', password='clave12345', rol=User.Rol.CAMPO)
        self.administrador = User.objects.create_user(
            username='abigail', password='clave12345', rol=User.Rol.ADMINISTRADOR
        )
        self.operaciones = User.objects.create_user(
            username='erik', password='clave12345', rol=User.Rol.OPERACIONES
        )

        self.list_url = reverse('hidraulica-list-create')

    def test_crear_registro_campo(self):
        self.client.force_authenticate(user=self.campo)

        response = self.client.post(self.list_url, {
            'punto_medicion': RegistroHidraulico.PuntoMedicion.PILA_NORTE_1,
            'estado': RegistroHidraulico.Estado.NORMAL,
            'nivel_pulgadas': '10.50',
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RegistroHidraulico.objects.count(), 1)
        registro = RegistroHidraulico.objects.get()
        self.assertEqual(registro.created_by, self.campo)
        self.assertEqual(response.data['nombre_punto_display'], 'Pila Norte 1')
        self.assertEqual(response.data['estado_display'], 'Normal')

    def test_operaciones_no_puede_crear_registro(self):
        self.client.force_authenticate(user=self.operaciones)

        response = self.client.post(self.list_url, {
            'punto_medicion': RegistroHidraulico.PuntoMedicion.PILA_NORTE_1,
            'estado': RegistroHidraulico.Estado.NORMAL,
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_campo_no_ve_registros_ajenos(self):
        RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PILA_NORTE_1,
            estado=RegistroHidraulico.Estado.NORMAL,
            created_by=self.campo,
        )
        RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PILA_SUR_1,
            estado=RegistroHidraulico.Estado.NORMAL,
            created_by=self.otro_campo,
        )

        self.client.force_authenticate(user=self.campo)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['created_by'], self.campo.id)

    def test_administrador_ve_todos_los_registros(self):
        RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PILA_NORTE_1,
            estado=RegistroHidraulico.Estado.NORMAL,
            created_by=self.campo,
        )
        RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PILA_SUR_1,
            estado=RegistroHidraulico.Estado.NORMAL,
            created_by=self.otro_campo,
        )

        self.client.force_authenticate(user=self.administrador)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_validar_registro_administrador(self):
        registro = RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.MANOMETRO_TRAMPA_SUR,
            estado=RegistroHidraulico.Estado.ALERTA,
            presion_psi='45.00',
            created_by=self.campo,
        )
        detail_url = reverse('hidraulica-detail', args=[registro.id])

        self.client.force_authenticate(user=self.administrador)
        response = self.client.patch(detail_url, {'validado': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        registro.refresh_from_db()
        self.assertTrue(registro.validado)
        self.assertEqual(registro.validado_por, self.administrador)

    def test_campo_no_puede_validar_registro(self):
        registro = RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.MANOMETRO_TRAMPA_SUR,
            estado=RegistroHidraulico.Estado.ALERTA,
            created_by=self.campo,
        )
        detail_url = reverse('hidraulica-detail', args=[registro.id])

        self.client.force_authenticate(user=self.campo)
        response = self.client.patch(detail_url, {'validado': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_falla_dispara_tarea_de_alerta(self):
        self.client.force_authenticate(user=self.campo)

        response = self.client.post(self.list_url, {
            'punto_medicion': RegistroHidraulico.PuntoMedicion.MANOMETRO_CASA_NORTE,
            'estado': RegistroHidraulico.Estado.FALLA,
            'presion_psi': '0.00',
            'observaciones': 'Sin presión en la línea',
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
