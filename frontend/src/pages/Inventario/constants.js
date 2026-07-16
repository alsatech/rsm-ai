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
