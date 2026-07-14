import io

from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import AdvertenciaChecklist, AlertaFlota, ChecklistVehiculo, FotoChecklist, Vehiculo

TOTAL_VEHICULOS_PRECARGADOS = 20


def token(user):
    return str(RefreshToken.for_user(user).access_token)


def crear_usuario(username, rol):
    return User.objects.create_user(username=username, password='rsm12345', rol=rol)


def crear_vehiculo(nombre='Savana Test', kilometraje_actual=1000, tipo=Vehiculo.Tipo.CAMIONETA):
    return Vehiculo.objects.create(
        nombre=nombre,
        tipo=tipo,
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

    def _checklist_data(self, tipo_reporte='salida', km_reporte='1000.00', vehiculo=None, nivel_combustible=80):
        return {
            'vehiculo': (vehiculo or self.vehiculo).id,
            'tipo_reporte': tipo_reporte,
            'km_reporte': km_reporte,
            'nivel_combustible': nivel_combustible,
            'estado_fisico': True,
            'presion_llantas': 'bien',
            'anticongelante': True,
            'nivel_aceite_motor': True,
            'nivel_aceite_transmision': True,
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

    def test_maximo_fotos(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        for _ in range(12):
            r = self.client.post(
                f'/api/v1/flota/checklists/{checklist_id}/fotos/',
                {'foto': imagen_test()},
                format='multipart',
            )
            self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        self.assertEqual(FotoChecklist.objects.filter(checklist_id=checklist_id).count(), 12)

        r = self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/fotos/',
            {'foto': imagen_test()},
            format='multipart',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_foto_checklist_con_item(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        r = self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/fotos/',
            {'foto': imagen_test(), 'item': 'presion_llantas'},
            format='multipart',
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['item'], 'presion_llantas')

    def test_historial_devuelve_urls_absolutas_de_fotos(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']
        self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/fotos/',
            {'foto': imagen_test(), 'item': 'presion_llantas'},
            format='multipart',
        )

        resp = self.client.get(f'/api/v1/flota/vehiculos/{self.vehiculo.id}/historial/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        foto_url = resp.data[0]['fotos'][0]['foto']
        self.assertTrue(foto_url.startswith('http'), f'Se esperaba una URL absoluta, se obtuvo: {foto_url}')

    def test_items_aplicables_salida_camioneta_general(self):
        checklist = ChecklistVehiculo.objects.create(
            vehiculo=self.vehiculo, tipo_reporte='salida', responsable=self.campo,
            km_reporte=1000, nivel_combustible=80,
            estado_fisico=True, presion_llantas='bien', anticongelante=True,
            nivel_aceite_motor=True, nivel_aceite_transmision=True,
        )
        FotoChecklist.objects.create(checklist=checklist, item='kilometraje', foto='x.jpg', uploaded_by=self.campo)
        items = checklist.items_aplicables()
        self.assertNotIn('soplado_filtro_aire', items)
        self.assertNotIn('carga_traila', items)
        self.assertIn('nivel_aceite_transmision', items)
        self.assertIn('kilometraje', items)
        self.assertEqual(checklist.total_items(), 6)
        self.assertEqual(checklist.items_verificados(), 6)

    def test_items_aplicables_salida_off_road_filtro_aire_y_traila(self):
        polaris = crear_vehiculo(nombre='Polaris Test', kilometraje_actual=0, tipo=Vehiculo.Tipo.POLARIS)
        checklist = ChecklistVehiculo.objects.create(
            vehiculo=polaris, tipo_reporte='salida', responsable=self.campo,
            km_reporte=0, nivel_combustible=80,
        )
        items = checklist.items_aplicables()
        self.assertIn('soplado_filtro_aire', items)
        self.assertIn('carga_traila', items)
        self.assertIn('kilometraje', items)
        self.assertNotIn('nivel_aceite_transmision', items)
        self.assertEqual(checklist.total_items(), 7)
        self.assertEqual(checklist.items_verificados(), 0)

    def test_items_aplicables_llegada_general(self):
        checklist = ChecklistVehiculo.objects.create(
            vehiculo=self.vehiculo, tipo_reporte='llegada', responsable=self.campo,
            km_reporte=1000, nivel_combustible=80,
            estado_fisico=True, lavado=True,
        )
        self.assertEqual(checklist.items_aplicables(), ['estado_fisico', 'lavado', 'kilometraje'])
        self.assertEqual(checklist.total_items(), 3)
        self.assertEqual(checklist.items_verificados(), 2)

    def test_items_aplicables_llegada_off_road_incluye_traila(self):
        can_am = crear_vehiculo(nombre='CanAm Test', kilometraje_actual=0, tipo=Vehiculo.Tipo.CAN_AM)
        checklist = ChecklistVehiculo.objects.create(
            vehiculo=can_am, tipo_reporte='llegada', responsable=self.campo,
            km_reporte=0, nivel_combustible=80,
        )
        self.assertEqual(checklist.items_aplicables(), ['estado_fisico', 'lavado', 'kilometraje', 'carga_traila'])
        self.assertEqual(checklist.total_items(), 4)

    def test_kilometraje_verificado_solo_con_foto(self):
        checklist = ChecklistVehiculo.objects.create(
            vehiculo=self.vehiculo, tipo_reporte='llegada', responsable=self.campo,
            km_reporte=1000, nivel_combustible=80, estado_fisico=True, lavado=True,
        )
        self.assertEqual(checklist.items_verificados(), 2)
        FotoChecklist.objects.create(checklist=checklist, item='kilometraje', foto='x.jpg', uploaded_by=self.campo)
        self.assertEqual(checklist.items_verificados(), 3)

    def test_gasolina_minima_50_por_ciento_para_salir(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(nivel_combustible=30),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_gasolina_baja_permitida_en_llegada(self):
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(tipo_reporte='llegada', nivel_combustible=10),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

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

    def test_llanta_cambiada_se_guarda(self):
        self._auth(self.campo)
        data = self._checklist_data()
        data['presion_llantas'] = 'delantero_izquierdo'
        data['llanta_cambiada'] = True
        resp = self.client.post('/api/v1/flota/checklists/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['llanta_cambiada'])

    def test_moto_sin_kilometraje(self):
        moto = crear_vehiculo(nombre='Moto Test', kilometraje_actual=0, tipo=Vehiculo.Tipo.MOTO)
        checklist_salida = ChecklistVehiculo.objects.create(
            vehiculo=moto, tipo_reporte='salida', responsable=self.campo,
            km_reporte=0, nivel_combustible=80,
        )
        self.assertNotIn('kilometraje', checklist_salida.items_aplicables())

        checklist_llegada = ChecklistVehiculo.objects.create(
            vehiculo=moto, tipo_reporte='llegada', responsable=self.campo,
            km_reporte=0, nivel_combustible=80,
        )
        self.assertNotIn('kilometraje', checklist_llegada.items_aplicables())

    def test_cuatrimoto_sin_kilometraje(self):
        # Las "motos" reales de la reserva (Moto roja, Moto azul) están dadas de alta como cuatrimoto.
        cuatrimoto = crear_vehiculo(nombre='Moto Roja Test', kilometraje_actual=0, tipo=Vehiculo.Tipo.CUATRIMOTO)
        checklist_salida = ChecklistVehiculo.objects.create(
            vehiculo=cuatrimoto, tipo_reporte='salida', responsable=self.campo,
            km_reporte=0, nivel_combustible=80,
        )
        items = checklist_salida.items_aplicables()
        self.assertNotIn('kilometraje', items)
        self.assertIn('soplado_filtro_aire', items)  # sigue siendo off-road para lo demás
        self.assertIn('carga_traila', items)

        checklist_llegada = ChecklistVehiculo.objects.create(
            vehiculo=cuatrimoto, tipo_reporte='llegada', responsable=self.campo,
            km_reporte=0, nivel_combustible=80,
        )
        self.assertNotIn('kilometraje', checklist_llegada.items_aplicables())

    def test_no_puede_salir_vehiculo_en_taller(self):
        vehiculo_taller = crear_vehiculo(nombre='En Taller Test', kilometraje_actual=1000)
        vehiculo_taller.estado = Vehiculo.Estado.EN_TALLER
        vehiculo_taller.save(update_fields=['estado'])

        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(vehiculo=vehiculo_taller),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vehiculo', resp.data)

    def test_no_puede_salir_vehiculo_de_baja(self):
        vehiculo_baja = crear_vehiculo(nombre='De Baja Test', kilometraje_actual=1000)
        vehiculo_baja.estado = Vehiculo.Estado.DE_BAJA
        vehiculo_baja.save(update_fields=['estado'])

        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(vehiculo=vehiculo_baja),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_puede_llegar_vehiculo_en_taller(self):
        vehiculo_taller = crear_vehiculo(nombre='En Taller Llegada Test', kilometraje_actual=1000)
        vehiculo_taller.estado = Vehiculo.Estado.EN_TALLER
        vehiculo_taller.save(update_fields=['estado'])

        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(vehiculo=vehiculo_taller, tipo_reporte='llegada'),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_resumen_incluye_checklists_sin_validar(self):
        self._auth(self.campo)
        self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')

        self._auth(self.admin)
        resp = self.client.get('/api/v1/flota/resumen/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['checklists_sin_validar'], 1)

    def test_items_aplicables_traila_simplificado(self):
        traila = Vehiculo.objects.create(
            nombre='Traila Checklist Test', tipo=Vehiculo.Tipo.TRAILA, marca='Fabricada', modelo='4x5',
            color='', kilometraje_actual=0,
        )
        checklist = ChecklistVehiculo.objects.create(
            vehiculo=traila, tipo_reporte='salida', responsable=self.campo,
            km_reporte=0, nivel_combustible=0,
            presion_llantas='bien', limpieza=True, sin_herramientas=True, sin_carga=True,
        )
        self.assertEqual(
            checklist.items_aplicables(), ['presion_llantas', 'limpieza', 'sin_herramientas', 'sin_carga']
        )
        self.assertEqual(checklist.total_items(), 4)
        self.assertEqual(checklist.items_verificados(), 4)

    def test_traila_no_requiere_medio_tanque(self):
        traila = Vehiculo.objects.create(
            nombre='Traila Sin Gasolina Test', tipo=Vehiculo.Tipo.TRAILA, marca='Fabricada', modelo='4x5',
            color='', kilometraje_actual=0,
        )
        self._auth(self.campo)
        resp = self.client.post(
            '/api/v1/flota/checklists/',
            self._checklist_data(vehiculo=traila, km_reporte='0', nivel_combustible=0),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_polaris_puede_seleccionar_traila_4x5(self):
        polaris = crear_vehiculo(nombre='Polaris Traila Test', kilometraje_actual=0, tipo=Vehiculo.Tipo.POLARIS)
        traila = Vehiculo.objects.create(
            nombre='Traila 4x5 Test', tipo=Vehiculo.Tipo.TRAILA, marca='Fabricada', modelo='4x5',
            color='', kilometraje_actual=0,
        )
        self._auth(self.campo)
        data = self._checklist_data(vehiculo=polaris)
        data['traila'] = traila.id
        resp = self.client.post('/api/v1/flota/checklists/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['traila'], traila.id)

    def test_traila_debe_ser_4x5(self):
        polaris = crear_vehiculo(nombre='Polaris Traila Test 2', kilometraje_actual=0, tipo=Vehiculo.Tipo.POLARIS)
        traila_grande = Vehiculo.objects.create(
            nombre='Traila Grande Test', tipo=Vehiculo.Tipo.TRAILA, marca='Fabricada', modelo='6x8',
            color='', kilometraje_actual=0,
        )
        self._auth(self.campo)
        data = self._checklist_data(vehiculo=polaris)
        data['traila'] = traila_grande.id
        resp = self.client.post('/api/v1/flota/checklists/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('traila', resp.data)

    def test_admin_puede_agregar_advertencia(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        self._auth(self.admin)
        resp = self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/advertencias/',
            {'motivo': 'Llegó con el filtro de aire sucio, favor de sopletearlo la próxima vez.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['creada_por'], self.admin.id)
        self.assertEqual(AdvertenciaChecklist.objects.filter(checklist_id=checklist_id).count(), 1)

    def test_campo_no_puede_agregar_advertencia(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        resp = self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/advertencias/',
            {'motivo': 'No debería poder crear esto.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_advertencia_no_bloquea_validacion(self):
        self._auth(self.campo)
        resp = self.client.post('/api/v1/flota/checklists/', self._checklist_data(), format='json')
        checklist_id = resp.data['id']

        self._auth(self.admin)
        self.client.post(
            f'/api/v1/flota/checklists/{checklist_id}/advertencias/',
            {'motivo': 'Revisar nivel de aceite la próxima vez.'},
            format='json',
        )
        resp = self.client.patch(
            f'/api/v1/flota/checklists/{checklist_id}/', {'validado': True}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['validado'])

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
