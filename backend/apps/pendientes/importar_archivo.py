"""Lectura de un archivo (.docx o .pdf) con tablas de pendientes/acuerdos en seguimiento.

Pensado para la "Minuta operativa" de la reserva: se leen las tablas de seguimiento
(columnas Nº y responsable / Acuerdo en seguimiento / Acuerdo logrado / ESTATUS / Fecha o
siguiente revisión). También entiende tablas genéricas con encabezados como Pendiente,
Descripción, Responsable, Prioridad y Fecha (sin importar acentos ni mayúsculas). Las tablas
sin encabezado (continuación de la anterior tras un salto de página) heredan las columnas de
la tabla previa. La tabla de "Instrucciones del supervisor para hoy" no se importa: son
instrucciones del día, no acuerdos en seguimiento.
"""
import re
import unicodedata
from datetime import datetime

from .models import Pendiente

SINONIMOS = {
    'titulo': {
        'pendiente', 'pendientes', 'titulo', 'tema', 'actividad', 'asunto', 'tarea', 'concepto',
        'acuerdo en seguimiento',
    },
    'descripcion': {
        'descripcion', 'detalle', 'comentarios', 'comentario', 'observaciones', 'notas', 'seguimiento',
        'acuerdo logrado',
    },
    'codigo': {
        'no', 'n.o', 'n°', 'num', 'numero', '#', 'no y responsable', 'n.o y responsable', 'n° y responsable',
    },
    'responsable': {'responsable', 'responsables', 'asignado', 'asignados', 'encargado', 'quien'},
    'prioridad': {'prioridad'},
    'estatus': {'estatus', 'estado', 'status'},
    'fecha': {'fecha', 'fecha compromiso', 'fecha limite', 'fecha de asignacion', 'fecha asignacion'},
    'revision': {'fecha o siguiente revision', 'siguiente revision', 'fecha de revision', 'revision'},
}
PRIORIDADES = {p.value for p in Pendiente.Prioridad}
LINEA_VINETA = re.compile(r'^\s*(?:[-•●▪*]|\d{1,3}[.)])\s+(.+)$')
CODIGO_Y_RESTO = re.compile(r'^([A-Za-z]{0,3}\d+[A-Za-z]?)\b\s*(.*)$')


def _normalizar(texto):
    texto = unicodedata.normalize('NFKD', str(texto or ''))
    texto = ''.join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', texto).strip().lower()


def _limpiar(celda):
    return re.sub(r'\s+', ' ', str(celda or '').replace('\n', ' ')).strip()


def _columnas(fila):
    columnas = {}
    for i, celda in enumerate(fila):
        nombre = _normalizar(celda)
        for campo, nombres in SINONIMOS.items():
            if nombre in nombres and campo not in columnas:
                columnas[campo] = i
    return columnas


def _parsear_fecha(texto):
    texto = _limpiar(texto)
    for formato in ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%y', '%d-%m-%y'):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None


def _separar_codigo(celda):
    """'P05 / EY coordina' -> ('P05', 'EY coordina'); 'EY' -> ('', 'EY')."""
    texto = _limpiar(str(celda or '').replace('/', ' '))
    match = CODIGO_Y_RESTO.match(texto)
    if match:
        return match.group(1), match.group(2).strip()
    return '', texto


def _fila_a_pendiente(fila, columnas):
    def crudo(campo):
        i = columnas.get(campo)
        return fila[i] if i is not None and i < len(fila) else ''

    def valor(campo):
        return _limpiar(crudo(campo))

    codigo, responsable = '', valor('responsable')
    if 'codigo' in columnas:
        codigo, resto = _separar_codigo(crudo('codigo'))
        responsable = ' '.join(x for x in (resto, responsable) if x)

    acuerdo = valor('titulo') or valor('descripcion')
    if not acuerdo:
        return None
    titulo = f'{codigo} · {acuerdo}' if codigo else acuerdo

    estatus = _normalizar(valor('estatus'))
    revision_cruda = valor('revision')
    es_prioritario = 'prioritari' in f'{estatus} {_normalizar(revision_cruda)}'
    revision = re.sub(r'prioritari[oa]', '', revision_cruda, flags=re.I).strip(' /-')

    prioridad = _normalizar(valor('prioridad'))
    if prioridad not in PRIORIDADES:
        prioridad = Pendiente.Prioridad.ALTA if es_prioritario else Pendiente.Prioridad.MEDIA

    estado, motivo = Pendiente.Estado.ABIERTO, None
    if 'pausa' in estatus:
        estado, motivo = Pendiente.Estado.BLOQUEADO, Pendiente.MotivoBloqueo.OTRO
    elif 'proceso' in estatus:
        estado = Pendiente.Estado.EN_PROCESO

    partes = [valor('descripcion') if 'titulo' in columnas else '']
    if responsable:
        partes.append(f'Responsable: {responsable}')
    if revision:
        partes.append(f'Siguiente revisión: {revision}')
    descripcion = '\n'.join(p for p in partes if p) or acuerdo

    fecha = _parsear_fecha(valor('fecha'))
    return {
        'codigo': codigo,
        'titulo': titulo[:200],
        'descripcion': descripcion,
        'prioridad': prioridad,
        'estado': estado,
        'motivo_bloqueo': motivo,
        'fecha_asignacion': fecha,
        'responsables': responsable,
    }


def _procesar_tablas(tablas):
    """tablas: lista de tablas, cada una lista de filas (listas de texto de celda)."""
    encontrados = []
    columnas_previas = None
    for tabla in tablas:
        if not tabla:
            continue
        columnas = _columnas(tabla[0])
        con_encabezado = 'titulo' in columnas or ('descripcion' in columnas and 'codigo' not in columnas)
        if con_encabezado:
            filas = tabla[1:]
        elif columnas_previas and len(tabla[0]) == columnas_previas['_n']:
            columnas, filas = columnas_previas, tabla  # continuación sin encabezado
        else:
            continue
        columnas_previas = {**columnas, '_n': len(tabla[0])}
        for fila in filas:
            if _columnas(fila) == {k: v for k, v in columnas.items() if k != '_n'}:
                continue  # encabezado repetido
            item = _fila_a_pendiente(fila, columnas)
            if item:
                encontrados.append(item)
    return encontrados


def _tablas_docx(archivo):
    import docx

    documento = docx.Document(archivo)
    tablas = []
    for tabla in documento.tables:
        filas = []
        for fila in tabla.rows:
            celdas, vistas = [], set()
            for celda in fila.cells:
                if id(celda._tc) in vistas:  # celda combinada: no repetirla
                    continue
                vistas.add(id(celda._tc))
                celdas.append(celda.text)
            filas.append(celdas)
        tablas.append(filas)
    return tablas


def _extraer_docx(archivo):
    return _procesar_tablas(_tablas_docx(archivo))


def _extraer_pdf(archivo):
    import pdfplumber

    tablas, lineas = [], []
    with pdfplumber.open(archivo) as pdf:
        for pagina in pdf.pages:
            tablas.extend(pagina.extract_tables())
            lineas.extend((pagina.extract_text() or '').splitlines())

    encontrados = _procesar_tablas(tablas)
    if encontrados:
        return encontrados

    for linea in lineas:
        match = LINEA_VINETA.match(linea)
        if match:
            texto = _limpiar(match.group(1))
            if texto:
                encontrados.append({
                    'codigo': '',
                    'titulo': texto[:200],
                    'descripcion': texto,
                    'prioridad': Pendiente.Prioridad.MEDIA,
                    'estado': Pendiente.Estado.ABIERTO,
                    'motivo_bloqueo': None,
                    'fecha_asignacion': None,
                    'responsables': '',
                })
    return encontrados


def extraer_pendientes(archivo, nombre):
    """Devuelve la lista de pendientes (dicts) detectados en un .docx o .pdf, en orden."""
    if nombre.lower().endswith('.docx'):
        return _extraer_docx(archivo)
    return _extraer_pdf(archivo)


def buscar_responsables(texto, usuarios):
    """Cruza nombres escritos en el archivo (ej. 'Abigail, Erik Y.') con usuarios del sistema.
    Devuelve (usuarios_encontrados, nombres_sin_coincidencia)."""
    encontrados, faltantes = [], []
    for nombre in re.split(r'[,;/]| y ', texto or ''):
        nombre = _normalizar(nombre)
        if not nombre:
            continue
        coincidencias = [
            u for u in usuarios
            if nombre in (_normalizar(u.username), _normalizar(u.first_name))
            or (len(nombre) > 2 and nombre in _normalizar(u.get_full_name()))
        ]
        if len(coincidencias) == 1:
            encontrados.append(coincidencias[0])
        else:
            faltantes.append(nombre)
    return encontrados, faltantes
