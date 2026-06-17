import io

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User

from .models import FotoPendiente, HistorialPendiente, Pendiente


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


def crear_pendiente(titulo='Prueba', created_by=None, asignados=None):
    p = Pendiente.objects.create(
        titulo=titulo,
        descripcion='Descripción de prueba',
        created_by=created_by,
    )
    if asignados:
        p.asignado_a.set(asignados)
    return p


class PendienteModelTest(TestCase):
    def setUp(self):
        self.admin = crear_usuario('abigail', User.Rol.ADMINISTRADOR)
        self.campo = crear_usuario('chino', User.Rol.CAMPO)

    def test_str_incluye_titulo_y_estado(self):
        p = crear_pendiente(created_by=self.admin)
        self.assertIn('Prueba', str(p))
        self.assertIn('Abierto', str(p))

    def test_bloqueo_sin_motivo_falla(self):
        p = crear_pendiente(created_by=self.admin)
        p.estado = Pendiente.Estado.BLOQUEADO
        with self.assertRaises(ValidationError):
            p.save()

    def test_cierre_registra_fecha(self):
        p = crear_pendiente(created_by=self.admin)
        p._usuario_cambio = self.admin
        p.estado = Pendiente.Estado.CERRADO
        p.cerrado_por = self.admin
        p.save()
        p.refresh_from_db()
        self.assertIsNotNone(p.fecha_cierre)

    def test_historial_se_genera_al_cambiar_estado(self):
        p = crear_pendiente(created_by=self.admin)
        p._usuario_cambio = self.admin
        p._nota_cambio = 'Iniciando trabajo'
        p.estado = Pendiente.Estado.EN_PROCESO
        p.save()
        self.assertEqual(HistorialPendiente.objects.filter(pendiente=p).count(), 1)
        h = HistorialPendiente.objects.get(pendiente=p)
        self.assertEqual(h.estado_anterior, Pendiente.Estado.ABIERTO)
        self.assertEqual(h.estado_nuevo, Pendiente.Estado.EN_PROCESO)
        self.assertEqual(h.nota, 'Iniciando trabajo')


class PendienteEndpointTest(APITestCase):
    def setUp(self):
        self.admin = crear_usuario('abigail', User.Rol.ADMINISTRADOR)
        self.superadmin = crear_usuario('alberto', User.Rol.SUPERADMIN)
        self.campo = crear_usuario('chino', User.Rol.CAMPO)
        self.otro_campo = crear_usuario('beto', User.Rol.CAMPO)
        self.operaciones = crear_usuario('erik', User.Rol.OPERACIONES)

        self.list_url = reverse('pendiente-list-create')
        self.resumen_url = reverse('pendiente-resumen')

    def test_crear_pendiente(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.list_url, {
            'titulo': 'Revisar pila',
            'descripcion': 'Verificar nivel en pila norte',
            'prioridad': Pendiente.Prioridad.ALTA,
            'origen': Pendiente.Origen.JUNTA,
            'modulo_relacionado': Pendiente.ModuloRelacionado.HIDRAULICA,
            'asignado_a': [],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pendiente.objects.count(), 1)
        self.assertEqual(Pendiente.objects.get().created_by, self.admin)

    def test_operaciones_no_puede_crear_pendiente(self):
        self.client.force_authenticate(user=self.operaciones)
        response = self.client.post(self.list_url, {
            'titulo': 'Prueba',
            'descripcion': 'Desc',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_campo_solo_ve_sus_pendientes(self):
        p1 = crear_pendiente('Para chino', created_by=self.admin, asignados=[self.campo])
        crear_pendiente('Para beto', created_by=self.admin, asignados=[self.otro_campo])

        self.client.force_authenticate(user=self.campo)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], p1.id)

    def test_campo_no_puede_cerrar(self):
        p = crear_pendiente(created_by=self.admin, asignados=[self.campo])
        url = reverse('pendiente-cambiar-estado', args=[p.id])
        self.client.force_authenticate(user=self.campo)
        response = self.client.post(url, {'estado': Pendiente.Estado.CERRADO}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bloqueo_sin_motivo_falla_endpoint(self):
        p = crear_pendiente(created_by=self.admin)
        url = reverse('pendiente-cambiar-estado', args=[p.id])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(url, {'estado': Pendiente.Estado.BLOQUEADO}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resumen_conteos_correctos(self):
        crear_pendiente('P1', created_by=self.admin)
        p2 = crear_pendiente('P2', created_by=self.admin)
        p2._usuario_cambio = self.admin
        p2.estado = Pendiente.Estado.EN_PROCESO
        p2.save()

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.resumen_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['abierto'], 1)
        self.assertEqual(response.data['en_proceso'], 1)
        self.assertEqual(response.data['total'], 2)

    def test_cierre_registra_fecha_y_usuario_endpoint(self):
        p = crear_pendiente(created_by=self.admin)
        # Subir foto de cierre antes de cerrar
        imagen = SimpleUploadedFile('evidencia.jpg', b'\xff\xd8\xff\xe0' + b'\x00' * 100, content_type='image/jpeg')
        FotoPendiente.objects.create(pendiente=p, foto=imagen, momento='cierre', uploaded_by=self.admin)

        url = reverse('pendiente-cambiar-estado', args=[p.id])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(url, {
            'estado': Pendiente.Estado.CERRADO,
            'nota': 'Trabajo completado',
            'solucion_cierre': 'Se reparó la fuga en la tubería.',
            'se_compro_material': False,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertIsNotNone(p.fecha_cierre)
        self.assertEqual(p.cerrado_por, self.admin)
        self.assertEqual(p.estado, Pendiente.Estado.CERRADO)
        self.assertEqual(p.solucion_cierre, 'Se reparó la fuga en la tubería.')

    def test_historial_accesible_para_admin(self):
        p = crear_pendiente(created_by=self.admin)
        p._usuario_cambio = self.admin
        p.estado = Pendiente.Estado.EN_PROCESO
        p.save()

        url = reverse('pendiente-historial', args=[p.id])
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_campo_no_accede_historial(self):
        p = crear_pendiente(created_by=self.admin, asignados=[self.campo])
        url = reverse('pendiente-historial', args=[p.id])
        self.client.force_authenticate(user=self.campo)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
