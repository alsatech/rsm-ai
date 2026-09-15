from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .excel import generar_excel_relacion
from .models import Factura


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


class FacturacionAPITest(APITestCase):
    def setUp(self):
        self.superadmin = crear_usuario('minerva_test', 'superadmin')
        self.administrador = crear_usuario('alexia_test', 'administrador')
        self.operaciones = crear_usuario('erik_test', 'operaciones')
        self.campo = crear_usuario('chino_test', 'campo')

    def _auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token(user)}')

    def _crear_factura(self, **overrides):
        data = {
            'numero_factura': 'FGTC-3048',
            'fecha': '2026-05-24',
            'concepto': 'Grupo Tec Computadoras',
            'importe': '1500.00',
            'modulo_origen': 'inventario',
        }
        data.update(overrides)
        self._auth(self.administrador)
        return self.client.post('/api/v1/facturacion/facturas/', data, format='json')

    def test_folio_autogenerado(self):
        resp1 = self._crear_factura()
        resp2 = self._crear_factura()
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp1.data['folio_interno'].startswith('FAC'))
        self.assertNotEqual(resp1.data['folio_interno'], resp2.data['folio_interno'])

    def test_mes_reporte_autocalculado(self):
        resp = self._crear_factura(fecha='2026-05-24')
        self.assertEqual(resp.data['mes_reporte'], '2026-05')

        resp_otro = self._crear_factura(fecha='2026-12-01')
        self.assertEqual(resp_otro.data['mes_reporte'], '2026-12')

    def test_excel_generado_con_formato_correcto(self):
        self._crear_factura(fecha='2026-05-24', numero_factura='FGTC-3048', concepto='Grupo Tec', importe='1500.00')
        self._crear_factura(fecha='2026-05-02', numero_factura='100126040083136', concepto='Combustibles de Acuña', importe='2500.50')

        facturas = Factura.objects.filter(mes_reporte='2026-05').order_by('fecha')
        wb, total = generar_excel_relacion(facturas)
        ws = wb.active

        self.assertEqual(ws['A2'].value, 'FECHA')
        self.assertEqual(ws['B2'].value, 'FACTURA')
        self.assertEqual(ws['C2'].value, 'CONCEPTO')
        self.assertEqual(ws['D2'].value, 'IMPORTE')

        self.assertEqual(ws['A3'].value, '02-May-26')
        self.assertEqual(ws['B3'].value, '100126040083136')
        self.assertEqual(ws['A4'].value, '24-May-26')

    def test_suma_total_correcta(self):
        self._crear_factura(fecha='2026-05-24', importe='1500.00')
        self._crear_factura(fecha='2026-05-02', importe='2500.50')

        facturas = Factura.objects.filter(mes_reporte='2026-05').order_by('fecha')
        wb, total = generar_excel_relacion(facturas)
        ws = wb.active

        self.assertEqual(total, 4000.50)
        self.assertEqual(ws['C5'].value, 'SUMA')
        self.assertEqual(ws['D5'].value, 4000.50)

    def test_solo_superadmin_genera_relacion(self):
        self._crear_factura(fecha='2026-05-24', importe='1500.00')

        self._auth(self.administrador)
        resp_admin = self.client.post('/api/v1/facturacion/relaciones/generar/', {'mes': '2026-05'}, format='json')
        self.assertEqual(resp_admin.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.superadmin)
        resp_ok = self.client.post('/api/v1/facturacion/relaciones/generar/', {'mes': '2026-05'}, format='json')
        self.assertEqual(resp_ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_ok.data['numero_facturas'], 1)
        self.assertTrue(resp_ok.data['archivo_excel'])

    def test_campo_y_operaciones_no_acceden_a_facturas(self):
        self._crear_factura(fecha='2026-05-24', importe='1500.00')

        self._auth(self.campo)
        resp_campo = self.client.get('/api/v1/facturacion/facturas/')
        self.assertEqual(resp_campo.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.operaciones)
        resp_ops = self.client.get('/api/v1/facturacion/facturas/')
        self.assertEqual(resp_ops.status_code, status.HTTP_403_FORBIDDEN)

    def test_resumen_visible_para_operaciones(self):
        self._crear_factura(fecha='2026-05-24', importe='1500.00')

        self._auth(self.operaciones)
        resp = self.client.get('/api/v1/facturacion/resumen/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_relacion_regenerada_actualiza_totales(self):
        self._crear_factura(fecha='2026-05-24', importe='1500.00')
        self._auth(self.superadmin)
        resp1 = self.client.post('/api/v1/facturacion/relaciones/generar/', {'mes': '2026-05'}, format='json')
        self.assertEqual(resp1.data['total'], '1500.00')

        self._crear_factura(fecha='2026-05-02', importe='500.00')
        self._auth(self.superadmin)
        resp2 = self.client.post('/api/v1/facturacion/relaciones/generar/', {'mes': '2026-05'}, format='json')
        self.assertEqual(resp2.data['total'], '2000.00')
        self.assertEqual(resp2.data['numero_facturas'], 2)

        resp_lista = self.client.get('/api/v1/facturacion/relaciones/')
        self.assertEqual(len(resp_lista.data), 1)
