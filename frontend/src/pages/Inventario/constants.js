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
  bodega: 'Bodega',
  granero: 'Granero',
  hangar: 'Hangar',
}

export const ESTADO_STOCK_CONFIG = {
  critico: { icon: '🔴', label: 'Crítico', border: 'border-error', text: 'text-error', bg: 'bg-error/10' },
  bajo: { icon: '🟡', label: 'Bajo', border: 'border-warning', text: 'text-warning', bg: 'bg-warning/10' },
  normal: { icon: '🟢', label: 'Normal', border: 'border-highlight', text: 'text-highlight', bg: 'bg-highlight/10' },
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

// Vehículos de la reserva para el selector de combustible (códigos de flota).
export const VEHICULOS_COMBUSTIBLE = [
  { codigo: 'SM-A001', nombre: 'Moto roja (CAN AM Outlander)' },
  { codigo: 'SM-A002', nombre: 'Moto azul (Polaris Sport Man)' },
  { codigo: 'SM-R001', nombre: 'El 1000 (Polaris Ranger 1000)' },
  { codigo: 'SM-R002', nombre: '166/#1 amarillo (CAN AM)' },
  { codigo: 'SM-R003', nombre: '107/#2 café (CAN AM)' },
  { codigo: 'SM-C001', nombre: 'Sierra (Chevrolet Sierra)' },
  { codigo: 'SM-C002', nombre: 'Blazer (Chevrolet Blazer)' },
  { codigo: 'SM-C003', nombre: 'Toyota (Tacoma)' },
  { codigo: 'SM-C004', nombre: 'Camioncito (Ford F250)' },
  { codigo: 'SM-R004', nombre: 'El 700 (Polaris Ranger 700)' },
  { codigo: 'SM-R005', nombre: 'El 900 (Polaris Ranger 900)' },
  { codigo: 'SM-V001', nombre: 'Savana (GMC Savana Van)' },
  { codigo: 'SM-M001', nombre: 'El piolín (Caterpillar)' },
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
  autorizada: { label: 'Autorizada', badge: 'bg-highlight/20 text-highlight border-highlight' },
  rechazada: { label: 'Rechazada', badge: 'bg-error/10 text-error border-error/40' },
  en_compra: { label: 'En compra', badge: 'bg-warning/10 text-warning border-warning/40' },
  enviada_rancho: { label: 'Enviada al rancho', badge: 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/40' },
  recibida_parcial: { label: 'Recibida parcial', badge: 'bg-warning/20 text-warning border-warning' },
  recibida_completa: { label: 'Recibida completa', badge: 'bg-highlight text-bg border-highlight' },
}

export const TABS_SOLICITUDES = [
  { value: '', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'autorizada', label: 'Autorizadas' },
  { value: 'enviada_rancho', label: 'En tránsito' },
  { value: 'recibida_completa', label: 'Recibidas' },
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
