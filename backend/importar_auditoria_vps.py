"""
Importa EXISTENCIAS DE AUDITORIA.xlsx al catálogo de Producto.
Uso:  DRY_RUN=1 python manage.py shell < importar_auditoria_vps.py   (revisar antes)
      python manage.py shell < importar_auditoria_vps.py             (real)

Ajusta RUTA_EXCEL si el archivo no está en backend/media/inventario/.
"""
import os
import re
from collections import defaultdict

import openpyxl
from django.db import transaction

from apps.inventario.models import CategoriaInventario, Producto, Ubicacion

RUTA_EXCEL = os.path.join(
    os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else '.',
    'media', 'inventario', 'EXISTENCIAS DE AUDITORIA.xlsx',
)
# Si el script no corre desde backend/, usa ruta absoluta explícita:
if not os.path.exists(RUTA_EXCEL):
    RUTA_EXCEL = 'media/inventario/EXISTENCIAS DE AUDITORIA.xlsx'

SECCIONES = [(5, 402, 'ALMACEN'), (404, 436, 'GRANERO'), (438, 617, 'OFICINA RSM'), (619, 666, 'BODEGA NUEVA')]

MAPEO_UBICACION = {
    'ALMACEN': 'almacen',
    'GRANERO': 'granero',
    'OFICINA RSM': 'oficina_reserva',
    'BODEGA NUEVA': 'bodega_nueva',
}

REGLAS_CATEGORIA = [
    ('Veterinaria y Sanidad', [
        'PRUEBA DE EMBARAZO', 'KIT PREGNANCY', 'ARETE', 'NEGASUNT', 'AMIDAN', 'AMIDON',
        'SULFALER', 'FIPROLINE', 'BIOQUIN', 'FLUVIOTIC', 'TIMPAKAPS', 'UNGÜENTO', 'RESPIFLO',
        'VETALGINA', 'HIDOFIN', 'BUTAFEN', 'LINIMENT', 'HAMISAN', 'FURACINE', 'IVERFULL',
        'SAFAMIXIN', 'ECTOLINE', 'ABUJAS', 'AGUJAS', 'DERMODINE', 'HERRADURA', 'CLAVO PARA HERRAR',
        'ALUSPRAY', 'TIGENT', 'SIYANTO', 'DMSO', 'FURA ZONE', 'SUERO', 'VACUNA', 'DESPARASIT',
        'INSECTICIDA', 'VENENO', 'ATRAYENTE PARA ABEJAS', 'ANTORCHA PARA NOPAL',
    ]),
    ('Alimentos y Costalera', [
        'MAIZ', 'ALPISTE', 'OMOLIN', 'PACA', 'SACO DE SAL', 'SALVADO', 'PELE', 'MELAZA',
        'LECHE DE BECERRO', 'SOBRE DE COMIDA', 'FORRAJE', 'CONCENTRADO',
    ]),
    ('Talabartería y Equipo de Montar', [
        'MONTURA', 'SUADERO', 'GAMARRA', 'BOZAL', 'MECATE', 'RIENDA', 'SILLIN', 'FILETE DE ARGOLLA',
        'TRES PIES', 'TIENTOS PARA MONTURA', 'FRENOS COMPLETOS',
    ]),
    ('Refacciones y Llantas', [
        'LLANTA', 'FILTRO DE ACEITE', 'FILTRO DE AIRE', 'FILTRO DE GASOLINA', 'FILTRO DE DIÉSEL',
        'FILTRO GP', 'FILTRO FF', 'FILTRO 33', 'FILTRO 51', 'FILTRO 22856', 'FILTR GP',
        'BANDA', 'BUJÍA', 'BUJIA', 'AMORTIGUADOR', 'ARRANCADOR USADO', 'TERMOSTATO USADO',
        'INYECTOR', 'ACEITE DE MOTOR', 'ACEITE LUBRICANTE', 'ACEITE HIDRAULICO', 'ACEITE DE TRANSMISION',
        'ANTICONGELANTE', 'ANTIFREEZER', 'BOMBA DE GASOLINA', 'BOMBA ELECTRICA DE GASOLINA',
        'CLAXON', 'TAPON DE GASOLINA', 'SWITCH LUCES', 'FANALES', 'EJES', 'RESORTE', 'POLEA',
        'PILA PARA CARRO', 'PILA P/ CARRO', 'ARNÉS PARA WINCH', 'ARNES PARA WINCH', 'FILTRO DE VALVULA',
        'LIQUIDO P/ FRENOS', 'LÍQUIDO LIMPIAPARABRISAS', 'LIQUIDO LIMPIAPARABRISAS',
    ]),
    ('Combustibles', ['GASOLINA', 'DIESEL']),
    ('Conexiones Hidráulicas', [
        'TUBO', 'CODO', 'COPLE', 'NIPLE', 'TEE', 'YEE', 'VALVULA', 'LLAVE DE PASO',
        'LLAVE DE RIEGO', 'LLAVE PARA MANGUERA', 'LLAVE DE RATON', 'MANGUERA', 'PVC',
        'TAPON', 'CAMPANA', 'ADAPTADOR', 'REDUCCION', 'CESPOL', 'REGADERA', 'FLOTADOR',
        'ABRAZADERA', 'CONECTOR', 'PURGADOR', 'CRUZ PARA CONEXIÓN', 'PICO DE BOTELLA', 'TEFLON',
    ]),
    ('Construcción y Materiales', [
        'CEMENTO', 'BLOCK', 'VARILLA', 'LAMINA', 'PINTURA', 'BOTE DE PINTURA', 'BOTELLA DE PINTURA',
        'CAL', 'ARENA', 'MALLA', 'MADERA', 'TABLA', 'TRIPLAY', 'PEGAAZULEJOS', 'BOQUILLA',
        'BASECOAT', 'VITROMEX', 'VITROMURO', 'SELLADOR', 'IMPERMEABILIZANTE', 'THINNER',
        'ESMALTE', 'SILICON', 'VIDRIO', 'TRAGALUCES', 'ESCALERA', 'LIJA', 'CABLE CONDUCTO',
        'CABLE DE SOLDADURA', 'SOLDADURA', 'ALAMBRE',
    ]),
    ('Herramientas', [
        'MARTILLO', 'PINZA', 'DESARMADOR', 'TALADRO', 'SIERRA', 'SEGUETA', 'CEGUETA',
        'LLAVE STILSON', 'NIVEL', 'ESCUADRA', 'SERRUCHO', 'CARRETILLA', 'PALA', 'PICO',
        'AZADON', 'RASTRILLO', 'BARRA', 'HACHA', 'TALACHE', 'BROCA', 'CORTADOR', 'MAZO',
        'CARDA', 'ROTOMARTILLO', 'MAQUINA DE SOLDAR', 'CARETA P/ SOLDAR', 'TERRAJA',
        'ENGRASADORA', 'PRENSA', 'LLANA', 'TENAZA', 'JUEGO DE MASA',
    ]),
]


def norm(s):
    return re.sub(r'\s+', ' ', str(s).strip().upper()).rstrip('.')


def categoria_para(nombre):
    for categoria, palabras in REGLAS_CATEGORIA:
        for palabra in palabras:
            if palabra in nombre:
                return categoria
    return 'Otros'


def leer_excel():
    wb = openpyxl.load_workbook(RUTA_EXCEL, data_only=True)
    ws = wb['INVENTARIO']
    datos = {}
    for start, end, nombre_seccion in SECCIONES:
        items = []
        for i in range(start, end + 1):
            nombre = ws.cell(row=i, column=2).value
            stock = ws.cell(row=i, column=3).value
            if nombre is None:
                continue
            items.append((norm(nombre), stock if stock is not None else 0))
        datos[nombre_seccion] = items
    return datos


DRY_RUN = os.environ.get('DRY_RUN') == '1'


class _Rollback(Exception):
    pass


excel_data = leer_excel()
categorias = {c.nombre: c for c in CategoriaInventario.objects.all()}
ubicaciones = {u.nombre: u for u in Ubicacion.objects.all()}

faltantes = [u for u in MAPEO_UBICACION.values() if u not in ubicaciones]
if faltantes:
    raise SystemExit(f'Faltan estas ubicaciones en la BD, revisa antes de continuar: {faltantes}')

siguiente_num = max(
    [int(m.group(1)) for m in (re.match(r'^SM-(\d+)$', p.codigo) for p in Producto.objects.all()) if m] or [0]
) + 1

resumen_categorias = defaultdict(int)
resumen_otros = []
creados = 0
actualizados = []


def importar():
    global creados, siguiente_num
    for excel_nombre, ubicacion_db in MAPEO_UBICACION.items():
        ubicacion = ubicaciones[ubicacion_db]
        productos_existentes = {
            norm(p.descripcion): p for p in Producto.objects.filter(ubicacion=ubicacion)
        }
        for nombre, stock in excel_data[excel_nombre]:
            existente = productos_existentes.get(nombre)
            if existente:
                anterior = existente.stock_actual
                existente.stock_actual = stock
                existente.save(update_fields=['stock_actual', 'updated_at'])
                actualizados.append((ubicacion_db, nombre, anterior, stock))
                continue

            categoria_nombre = categoria_para(nombre)
            resumen_categorias[categoria_nombre] += 1
            if categoria_nombre == 'Otros':
                resumen_otros.append((ubicacion_db, nombre))

            codigo = f'SM-{siguiente_num:03d}'
            siguiente_num += 1
            Producto.objects.create(
                codigo=codigo, descripcion=nombre, categoria=categorias[categoria_nombre],
                ubicacion=ubicacion, stock_actual=stock,
            )
            creados += 1
    if DRY_RUN:
        raise _Rollback


try:
    with transaction.atomic():
        importar()
except _Rollback:
    print('*** DRY RUN: todo revertido, no se guardó nada ***')

print(f'\nProductos creados: {creados}')
print(f'Productos actualizados (coincidencia por nombre): {len(actualizados)}')
for ubic, nombre, anterior, nuevo in actualizados:
    print(f'  [{ubic}] {nombre}: {anterior} -> {nuevo}')
print('\nDistribución por categoría (solo nuevos):')
for cat, n in sorted(resumen_categorias.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {n}')
print(f'\n"Otros" ({len(resumen_otros)}) — revisar/reclasificar después.')
