from datetime import date

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.flota.models import ChecklistVehiculo, Vehiculo
from apps.ganado.models import RecorridoGanado
from apps.hidraulica.models import RegistroHidraulico
from apps.pendientes.models import Pendiente
from apps.users.models import User

from .models import Minuta

FECHA = '2026-05-20'


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


class MinutaAPITest(APITestCase):
    def setUp(self):
        self.superadmin = crear_usuario('minerva_test', 'superadmin')
        self.administrador = crear_usuario('alexia_test', 'administrador')
        self.operaciones = crear_usuario('erik_test', 'operaciones')
        self.inventario = crear_usuario('yajaira_test', 'inventario')
        self.campo = crear_usuario('chino_test', 'campo')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_datos_del_dia(self):
        fecha_hora = timezone.datetime(2026, 5, 20, 10, 0, tzinfo=timezone.get_current_timezone())

        RegistroHidraulico.objects.create(
            punto_medicion=RegistroHidraulico.PuntoMedicion.PILA_NORTE_1,
            estado=RegistroHidraulico.Estado.FALLA,
            nivel_pulgadas='12.50',
            observaciones='Nivel bajo',
            fecha_hora=fecha_hora,
            created_by=self.campo,
        )

        Pendiente.objects.create(
            titulo='Reparar bomba', descripcion='La bomba norte no enciende',
            estado=Pendiente.Estado.BLOQUEADO, motivo_bloqueo=Pendiente.MotivoBloqueo.FALTA_MATERIAL,
            created_by=self.administrador,
        )

        vehiculo = Vehiculo.objects.create(
            nombre='Camioneta 1', tipo=Vehiculo.Tipo.CAMIONETA, marca='Ford', modelo='F150',
            color='Blanco', kilometraje_actual='10000.00',
        )
        ChecklistVehiculo.objects.create(
            vehiculo=vehiculo, tipo_reporte=ChecklistVehiculo.TipoReporte.LLEGADA,
            responsable=self.campo, fecha_hora=fecha_hora, incidencia_nueva='Golpe en la puerta',
        )

        RecorridoGanado.objects.create(
            fecha='2026-05-20', responsable=self.campo, created_by=self.campo,
            numero_cabezas=50, estado_hato=RecorridoGanado.EstadoHato.BIEN, narrativa='Todo en orden',
        )

    def test_campo_no_puede_ver_minuta(self):
        self._auth(self.campo)
        resp = self.client.get(f'/api/v1/minuta/{FECHA}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_operaciones_no_puede_ver_minuta(self):
        self._auth(self.operaciones)
        resp = self.client.get(f'/api/v1/minuta/{FECHA}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_inventario_no_puede_ver_minuta(self):
        self._auth(self.inventario)
        resp = self.client.get(f'/api/v1/minuta/{FECHA}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrador_puede_ver_minuta(self):
        self._auth(self.administrador)
        resp = self.client.get(f'/api/v1/minuta/{FECHA}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data['minuta'])

    def test_fecha_invalida(self):
        self._auth(self.superadmin)
        resp = self.client.get('/api/v1/minuta/no-es-fecha/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_detalle_agrega_datos_de_los_cuatro_modulos(self):
        self._crear_datos_del_dia()
        self._auth(self.superadmin)
        resp = self.client.get(f'/api/v1/minuta/{FECHA}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        datos = resp.data['datos']

        self.assertEqual(len(datos['hidraulica']), 1)
        self.assertEqual(datos['hidraulica'][0]['estado'], 'falla')

        self.assertEqual(len(datos['pendientes']['abiertos_y_bloqueados']), 1)
        self.assertEqual(datos['pendientes']['abiertos_y_bloqueados'][0]['titulo'], 'Reparar bomba')

        self.assertEqual(len(datos['flota']['checklists']), 1)
        self.assertEqual(len(datos['flota']['con_incidencias']), 1)

        self.assertEqual(len(datos['ganado']['recorridos']), 1)
        self.assertEqual(datos['ganado']['recorridos'][0]['numero_cabezas'], 50)

    def test_generar_crea_minuta_y_es_idempotente(self):
        self._auth(self.superadmin)
        resp = self.client.post(f'/api/v1/minuta/{FECHA}/generar/', {'notas': 'Primera versión'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Minuta.objects.count(), 1)
        self.assertEqual(resp.data['notas'], 'Primera versión')
        self.assertEqual(resp.data['generada_por_detalle']['username'], 'minerva_test')

        resp2 = self.client.post(f'/api/v1/minuta/{FECHA}/generar/', {'notas': 'Versión corregida'}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(Minuta.objects.count(), 1)
        self.assertEqual(resp2.data['notas'], 'Versión corregida')

    def test_campo_no_puede_generar(self):
        self._auth(self.campo)
        resp = self.client.post(f'/api/v1/minuta/{FECHA}/generar/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_pdf_se_descarga_con_content_type_correcto(self):
        self._crear_datos_del_dia()
        self._auth(self.administrador)
        self.client.post(f'/api/v1/minuta/{FECHA}/generar/', {'notas': 'Junta del día'}, format='json')

        resp = self.client.get(f'/api/v1/minuta/{FECHA}/pdf/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertIn(f'minuta_{FECHA}.pdf', resp['Content-Disposition'])

    def test_lista_historial(self):
        self._auth(self.superadmin)
        self.client.post(f'/api/v1/minuta/{FECHA}/generar/', {}, format='json')
        self.client.post('/api/v1/minuta/2026-05-21/generar/', {}, format='json')

        resp = self.client.get('/api/v1/minuta/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)
        self.assertEqual(resp.data[0]['fecha'], '2026-05-21')


class PendientesFormatoMinutaOperativaTest(TestCase):
    def test_separa_numero_acuerdo_logrado_responsable_y_revision(self):
        from apps.minuta.services import datos_pendientes
        admin = User.objects.create_user(username='adm_fmt', password='x', rol=User.Rol.ADMINISTRADOR)
        Pendiente.objects.create(
            titulo='P05 · Contratar tres elementos', created_by=admin, estado=Pendiente.Estado.EN_PROCESO,
            descripcion='Vacante publicada.\nResponsable: EY\nSiguiente revisión: 11/11/2026',
        )
        Pendiente.objects.create(titulo='Pendiente a mano', descripcion='Detalle libre', created_by=admin)
        Pendiente.objects.create(
            titulo='003 · Impermeabilizar', descripcion='x', created_by=admin,
            estado=Pendiente.Estado.BLOQUEADO, motivo_bloqueo=Pendiente.MotivoBloqueo.OTRO,
        )
        cerrado = Pendiente.objects.create(titulo='011 · Cerrado', descripcion='x', created_by=admin)
        cerrado.estado = Pendiente.Estado.CERRADO
        cerrado.save()

        filas = datos_pendientes(date.today())['abiertos_y_bloqueados']
        self.assertEqual([f['codigo'] for f in filas], ['003', 'P05', ''])  # orden del documento; sin Nº al final
        self.assertEqual(filas[0]['estatus_minuta'], 'EN PAUSA')
        p05 = filas[1]
        self.assertEqual(
            (p05['acuerdo'], p05['acuerdo_logrado'], p05['responsable'], p05['fecha_revision'], p05['estatus_minuta']),
            ('Contratar tres elementos', 'Vacante publicada.', 'EY', '11/11/2026', 'EN PROCESO'),
        )
        self.assertEqual(filas[2]['acuerdo_logrado'], 'Detalle libre')


class CerradosVentanaMinutaTest(TestCase):
    def test_cierre_aparece_una_sola_vez(self):
        from datetime import datetime, timedelta

        from django.utils import timezone

        from apps.minuta.services import datos_pendientes
        admin = User.objects.create_user(username='adm_cierre', password='x', rol=User.Rol.ADMINISTRADOR)
        p = Pendiente.objects.create(titulo='X', descripcion='x', created_by=admin)
        Pendiente.objects.filter(pk=p.pk).update(
            estado=Pendiente.Estado.CERRADO,
            fecha_cierre=timezone.make_aware(datetime(2026, 11, 13, 10, 0)),  # viernes
        )
        titulos = lambda f: [x['titulo'] for x in datos_pendientes(f)['cerrados_hoy']]  # noqa: E731
        self.assertEqual(titulos(date(2026, 11, 13)), ['X'])   # viernes
        self.assertEqual(titulos(date(2026, 11, 14)), ['X'])   # sábado: aún aparece
        self.assertEqual(titulos(date(2026, 11, 15)), [])      # domingo: ya no
        self.assertEqual(titulos(date(2026, 11, 12)), [])      # antes del cierre
