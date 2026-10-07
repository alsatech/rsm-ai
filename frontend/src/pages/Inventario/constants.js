// Separador para empacar código + descripción + ubicación dentro del contenido del QR, para
// que la app Katasymbol (al "escanear código" y reimprimir) muestre también esos datos como
// texto y no solo el símbolo pelón. Los escáneres propios del sistema (RecepcionFacil,
// SalidaFacil, Paso1Producto) solo necesitan el primer segmento — por eso usamos "|" y no un
// salto de línea: una pistola de escaneo USB/Bluetooth emula un teclado y un "\n" se transmite
// como tecla Enter, lo que cortaría la lectura a la mitad.
const SEPARADOR_PAYLOAD_QR = '|'

export function construirPayloadQr(producto, ubicacionTexto) {
  const descripcion = (producto.descripcion || '').slice(0, 35)
  return [producto.codigo, descripcion, ubicacionTexto || '']
    .filter(Boolean)
    .join(` ${SEPARADOR_PAYLOAD_QR} `)
}

// El código de barras CODE128 se queda solo con el código (sin este payload compuesto): meterle
// más texto lo vuelve demasiado ancho/denso para una etiqueta de 48mm, y su línea de lectura
// humana (abajo del símbolo) ya la agrega la app Katasymbol automáticamente.
export function extraerCodigoEscaneado(texto) {
  return (texto || '').split(SEPARADOR_PAYLOAD_QR)[0].trim()
}

// Prefijo que distingue la etiqueta de una UBICACIÓN (pegada en la puerta/anaquel) de la
// etiqueta de un PRODUCTO: sin esto, "Escanear ubicación" no podría saber si lo que detectó la
// cámara es un lugar o un producto, ya que ambos son texto plano dentro de un QR.
const PREFIJO_UBICACION_QR = 'UBICACION:'

export function construirPayloadQrUbicacion(ubicacionId, ubicacionTexto) {
  return `${PREFIJO_UBICACION_QR}${ubicacionId}|${ubicacionTexto || ''}`
}

// Devuelve el id de la ubicación si el texto escaneado viene de una etiqueta de ubicación,
// o null si es de otro tipo de código (producto, basura, etc.).
export function extraerUbicacionIdEscaneada(texto) {
  const limpio = (texto || '').trim()
  if (!limpio.startsWith(PREFIJO_UBICACION_QR)) return null
  const id = limpio.slice(PREFIJO_UBICACION_QR.length).split('|')[0].trim()
  return id || null
}

export const UNIDAD_LABELS = {
  pieza: 'Pieza',
  saco: 'Saco',
  rollo: 'Rollo',
  litro: 'Litro',
  metro: 'Metro',
  caja: 'Caja',
  kilogramo: 'Kilogramo',
  par: 'Par',
  juego: 'Juego',
  otro: 'Otro',
}

export const UBICACION_LABELS = {
  alacena: 'Alacena',
  almacen: 'Almacén',
  bodega: 'Bodega',
  bodega_nueva: 'Bodega Nueva',
  granero: 'Granero',
  hangar: 'Hangar',
  oficina_ca: 'Oficina CA',
  oficina_reserva: 'Oficina Reserva',
  taller: 'Taller',
  patio_yarda: 'Patio/Yarda',
}

export const UBICACION_ICONS = {
  alacena: '🥫',
  almacen: '📦',
  bodega: '🏬',
  bodega_nueva: '🏭',
  granero: '🌾',
  hangar: '✈️',
  oficina_ca: '🏢',
  oficina_reserva: '🏞️',
  taller: '🔧',
  patio_yarda: '🚜',
}

// Prueba piloto de escaneo físico (pistola USB/Bluetooth): mientras solo se pruebe en Granero,
// un producto escaneado en recepción debe pertenecer a esta ubicación o se bloquea con aviso.
// Cuando se extienda a más ubicaciones, esto debe volverse un selector en vez de una constante fija.
export const UBICACION_PILOTO_ESCANEO = 'granero'

export const ESTADO_STOCK_CONFIG = {
  critico: { icon: '🔴', label: 'Crítico', border: 'border-error', text: 'text-error', bg: 'bg-error/10' },
  bajo: { icon: '🟡', label: 'Bajo', border: 'border-warning', text: 'text-warning', bg: 'bg-warning/10' },
  normal: { icon: '🟢', label: 'Normal', border: 'border-highlight', text: 'text-highlight', bg: 'bg-highlight/10' },
}

export const CRITICIDAD_LABELS = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

// Clasificación ABC Multicriterio — ver backend/media/inventario/ABC_Multicriterio_RSM.pdf
export const CLASE_ABC_CONFIG = {
  A: {
    label: 'Clase A',
    desc: 'Control máximo · revisión semanal',
    border: 'border-highlight',
    text: 'text-highlight',
    bg: 'bg-highlight/10',
  },
  B: {
    label: 'Clase B',
    desc: 'Control moderado · revisión quincenal',
    border: 'border-warning',
    text: 'text-warning',
    bg: 'bg-warning/10',
  },
  C: {
    label: 'Clase C',
    desc: 'Control básico · revisión mensual',
    border: 'border-border',
    text: 'text-text-secondary',
    bg: 'bg-border/20',
  },
}

// Sugerencias rápidas para agilizar la captura de "¿para qué se usó?" en campo.
export const SUGERENCIAS_USO = [
  'Revoltura saleros',
  'Bebederos',
  'Conexiones',
  'Cerqueros',
  'Albañiles',
  'Para el ganado',
]

export function esProductoCombustible(producto) {
  return producto?.categoria_detalle?.nombre === 'Combustibles'
}

export function estadoStock(producto) {
  if (Number(producto.stock_actual) <= 0) return 'critico'
  if (producto.stock_minimo && Number(producto.stock_minimo) > 0 && Number(producto.stock_actual) <= Number(producto.stock_minimo)) {
    return 'bajo'
  }
  return 'normal'
}

// ─── Adquisiciones — Protocolo de Adquisición, Recepción y Envío de Material ───

export const AREA_LABELS = {
  campo: 'Campo',
  hidraulica: 'Hidráulica',
  construccion: 'Construcción',
  ganado: 'Ganado',
  flota: 'Flota',
  administracion: 'Administración',
  otro: 'Otro',
}

export const ESTADO_SOLICITUD_CONFIG = {
  borrador: { label: 'Borrador', badge: 'bg-border/40 text-text-secondary border-border' },
  enviada: { label: 'Enviada', badge: 'bg-highlight/10 text-highlight border-highlight/40' },
  autorizada: { label: 'Lista para compra', badge: 'bg-highlight/20 text-highlight border-highlight' },
  rechazada: { label: 'Rechazada', badge: 'bg-error/10 text-error border-error/40' },
  en_compra: { label: 'En compra', badge: 'bg-warning/10 text-warning border-warning/40' },
  enviada_rancho: { label: 'Enviada al rancho', badge: 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/40' },
  recibida_parcial: { label: 'Recibida parcial', badge: 'bg-warning/20 text-warning border-warning' },
  recibida_completa: { label: 'Recibida completa', badge: 'bg-highlight text-bg border-highlight' },
}

export const TABS_SOLICITUDES = [
  { value: '', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'autorizada', label: 'Listas para compra' },
  { value: 'enviada_rancho', label: 'En tránsito' },
  { value: 'recibida_completa,recibida_parcial', label: 'Recibidas' },
]

export const TIPO_REPORTE_CONFIG = {
  faltante: { label: 'Faltante', badge: 'bg-error/10 text-error border-error/40', icon: '❌' },
  danio: { label: 'Daño', badge: 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/40', icon: '⚠️' },
  irregularidad: { label: 'Irregularidad', badge: 'bg-warning/10 text-warning border-warning/40', icon: '❗' },
}

export const ESTADO_ITEM_CONFIG = {
  ok: { label: 'OK', icon: '✅', activo: 'border-highlight bg-highlight/10 text-highlight' },
  daniado: { label: 'Dañado', icon: '⚠️', activo: 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]' },
  faltante: { label: 'Faltante', icon: '❌', activo: 'border-error bg-error/10 text-error' },
}
