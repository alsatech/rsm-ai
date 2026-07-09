import io

from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import AlertaFlota, ChecklistVehiculo, FotoChecklist, Vehiculo

TOTAL_VEHICULOS_PRECARGADOS = 20


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


def crear_vehiculo(nombre='Savana Test', kilometraje_actual=1000):
    return Vehiculo.objects.create(
        nombre=nombre,
        tipo=Vehiculo.Tipo.CAMIONETA,
        marca='GMC',
        modelo='Savana',
        anio=2009,
        color='Blanco',
        kilometraje_actual=kilometraje_actual,
    )


def imagen_test():
    buffer = io.BytesIO()
    Image.new('RGB', (10, 10)).save(buffer, format='JPEG')
    buffer.seek(0)
    buffer.name = 'foto.jpg'
    return buffer


class VehiculosPrecargadosTest(TestCase):
    def test_vehiculos_precargados_existen(self):
        self.assertEqual(Vehiculo.objects.count(), TOTAL_VEHICULOS_PRECARGADOS)


class FlotaAPITest(APITestCase):
    def setUp(self):
        self.campo = crear_usuario('chino_test', 'campo')
        self.admin = crear_usuario('abigail_test', 'administrador')
        self.operaciones = crear_usuario('erik_test', 'operaciones')
        self.superadmin = crear_usuario('alberto_test', 'superadmin')
        self.vehiculo = crear_vehiculo(kilometraje_actual=1000)

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _checklist_data(self, tipo_reporte='salida', km_reporte='1000.00'):
        return {
            'vehiculo': self.vehiculo.id,
            'tipo_reporte': tipo_reporte,
            'km_reporte': km_reporte,
            'nivel_combustible': 80,
            'carroceria_pintura': True,
            'parabrisas_vidrios': True,
        }

    def test_crear_checklist_salida(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['responsable'], self.campo.id)
        self.assertEqual(ChecklistVehiculo.objects.count(), 1)

    def test_km_llegada_actualiza_vehiculo(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(tipo_reporte='llegada', km_reporte='1500.00'),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.kilometraje_actual, 1500)

    def test_km_llegada_no_retrocede_vehiculo(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(tipo_reporte='llegada', km_reporte='500.00'),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.vehiculo.refresh_from_db()
        self.assertEqual(self.vehiculo.kilometraje_actual, 1000)

    def test_maximo_6_fotos(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        for _ in range(6):
            r = self.client.post(
                f'/api/v1/flota/checklists/{checklist_id}/fotos/',
                {'foto': imagen_test()},
                format='multipart',
            )
            self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        self.assertEqual(FotoChecklist.objects.filter(checklist_id=checklist_id).count(), 6)

        r = self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/fotos/',
            {'foto': imagen_test()},
            format='multipart',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_alerta_vencimiento_30_dias(self):
        hoy = timezone.now().date()
        vehiculo = Vehiculo.objects.create(
            nombre='Con vencimiento',
            tipo=Vehiculo.Tipo.CAMIONETA,
            marca='GMC',
            modelo='Savana',
            anio=2009,
            color='Blanco',
            kilometraje_actual=0,
            fecha_vencimiento_tenencia=hoy + timezone.timedelta(days=15),
        )
        alertas = AlertaFlota.objects.filter(
            vehiculo=vehiculo, tipo=AlertaFlota.Tipo.VENCIMIENTO_TENENCIA,
        )
        self.assertEqual(alertas.count(), 1)

    def test_campo_no_puede_validar(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        resp = self.client.patch(
            f'/api/v1/flota/checklists/{checklist_id}/', {'validado': True}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_validar(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        self._auth(self.admin)
        resp = self.client.patch(
            f'/api/v1/flota/checklists/{checklist_id}/', {'validado': True}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['validado'])
        self.assertEqual(resp.data['validado_por'], self.admin.id)

    def test_erik_puede_editar_vehiculo(self):
        self._auth(self.operaciones)
        resp = self.client.patch(
            f'/api/v1/flota/vehiculos/{self.vehiculo.id}/', {'notas': 'Revisar frenos'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['notas'], 'Revisar frenos')

    def test_campo_no_puede_editar_vehiculo(self):
        self._auth(self.campo)
        resp = self.client.patch(
            f'/api/v1/flota/vehiculos/{self.vehiculo.id}/', {'notas': 'Revisar frenos'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_solo_superadmin_elimina_vehiculo(self):
        self._auth(self.operaciones)
        resp = self.client.delete(f'/api/v1/flota/vehiculos/{self.vehiculo.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.superadmin)
        resp = self.client.delete(f'/api/v1/flota/vehiculos/{self.vehiculo.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_resolver_alerta(self):
        alerta = AlertaFlota.objects.create(
            vehiculo=self.vehiculo,
            tipo=AlertaFlota.Tipo.MANTENIMIENTO_GENERAL,
            descripcion='Revisión general',
        )
        self._auth(self.admin)
        resp = self.client.patch(
            f'/api/v1/flota/alertas/{alerta.id}/resolver/', {'notas': 'Listo'}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        alerta.refresh_from_db()
        self.assertTrue(alerta.resuelta)
        self.assertFalse(alerta.activa)
        self.assertEqual(alerta.resuelta_por, self.admin)

    def test_resumen_flota(self):
        self._auth(self.admin)
        resp = self.client.get('/api/v1/flota/resumen/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('vehiculos_activos', resp.data)
        self.assertIn('alertas_activas', resp.data)
