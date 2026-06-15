from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User

from .models import AlertaMantenimientoGenerador, ChecklistGenerador, Generador, RegistroHidraulico
from .tasks import revisar_alertas_generadores


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


class GeneradorModelTest(TestCase):
    def test_generadores_precargados_con_alertas(self):
        self.assertEqual(Generador.objects.count(), 3)

        chapote = Generador.objects.get(nombre=Generador.Nombre.CHAPOTE)
        self.assertEqual(chapote.marca_modelo, 'Wacker Neuson G25 20kW')
        self.assertEqual(chapote.horas_operacion, Decimal('0.00'))
        self.assertEqual(chapote.alertas_mantenimiento.count(), 3)


class GeneradorEndpointTest(APITestCase):
    def setUp(self):
        self.campo = User.objects.create_user(username='chino', password='clave12345', rol=User.Rol.CAMPO)
        self.otro_campo = User.objects.create_user(username='beto', password='clave12345', rol=User.Rol.CAMPO)
        self.administrador = User.objects.create_user(
            username='abigail', password='clave12345', rol=User.Rol.ADMINISTRADOR
        )

        self.generador = Generador.objects.get(nombre=Generador.Nombre.CHAPOTE)
        self.list_url = reverse('generador-list')
        self.detail_url = reverse('generador-detail', args=[self.generador.id])
        self.checklist_url = reverse('generador-checklist', args=[self.generador.id])

    def test_checklist_completo(self):
        self.client.force_authenticate(user=self.campo)

        response = self.client.post(self.checklist_url, {
            'nivel_aceite': True,
            'nivel_refrigerante': True,
            'filtro_aire': True,
            'sin_fugas': True,
            'observaciones': 'Todo en orden',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registro = ChecklistGenerador.objects.get()
        self.assertEqual(registro.generador, self.generador)
        self.assertEqual(registro.created_by, self.campo)
        self.assertTrue(registro.nivel_aceite)
        self.assertTrue(registro.nivel_refrigerante)
        self.assertTrue(registro.filtro_aire)
        self.assertTrue(registro.sin_fugas)

    def test_checklist_incompleto_guarda_igual(self):
        self.client.force_authenticate(user=self.campo)

        response = self.client.post(self.checklist_url, {
            'nivel_aceite': True,
            'observaciones': 'Falta revisar refrigerante y filtro de aire',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registro = ChecklistGenerador.objects.get()
        self.assertTrue(registro.nivel_aceite)
        self.assertFalse(registro.nivel_refrigerante)
        self.assertFalse(registro.filtro_aire)
        self.assertFalse(registro.sin_fugas)

    def test_alerta_por_horas(self):
        self.generador.horas_operacion = Decimal('260.00')
        self.generador.save()
        alerta = AlertaMantenimientoGenerador.objects.get(generador=self.generador, horas_intervalo=250)
        self.assertIsNone(alerta.ultima_alerta)

        revisar_alertas_generadores()

        alerta.refresh_from_db()
        self.assertIsNotNone(alerta.ultima_alerta)

    def test_campo_no_actualiza_horas(self):
        self.client.force_authenticate(user=self.campo)

        response = self.client.patch(self.detail_url, {'horas_operacion': '300.00'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.generador.refresh_from_db()
        self.assertEqual(self.generador.horas_operacion, Decimal('0.00'))

    def test_administrador_actualiza_horas(self):
        self.client.force_authenticate(user=self.administrador)

        response = self.client.patch(self.detail_url, {'horas_operacion': '300.50'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.generador.refresh_from_db()
        self.assertEqual(self.generador.horas_operacion, Decimal('300.50'))
        self.assertEqual(self.generador.updated_by, self.administrador)

    def test_campo_solo_ve_su_propio_historial(self):
        ChecklistGenerador.objects.create(generador=self.generador, created_by=self.campo, nivel_aceite=True)
        ChecklistGenerador.objects.create(generador=self.generador, created_by=self.otro_campo, nivel_aceite=True)

        self.client.force_authenticate(user=self.campo)
        response = self.client.get(self.checklist_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_generadores_list_incluye_alertas_pendientes(self):
        self.generador.horas_operacion = Decimal('1200.00')
        self.generador.save()

        self.client.force_authenticate(user=self.administrador)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        chapote = next(g for g in response.data if g['nombre'] == 'chapote')
        self.assertEqual(len(chapote['alertas_pendientes']), 3)
