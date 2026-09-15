export const MODULO_ORIGEN_OPCIONES = [
  { value: 'inventario', label: 'Inventario' },
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'flota', label: 'Flota' },
  { value: 'sanidad', label: 'Sanidad' },
  { value: 'personal', label: 'Personal' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otro', label: 'Otro' },
]

export const MODULO_ORIGEN_LABELS = Object.fromEntries(MODULO_ORIGEN_OPCIONES.map((o) => [o.value, o.label]))

export const MODULO_ORIGEN_ICONOS = {
  inventario: '📦',
  proyectos: '🏗️',
  flota: '🚚',
  sanidad: '🩺',
  personal: '👤',
  nomina: '💵',
  combustible: '⛽',
  impuestos: '🏛️',
  otro: '📎',
}

export function mesActualISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

export function formatMesLabel(mes) {
  if (!mes) return ''
  const [anio, mesNum] = mes.split('-')
  return new Date(`${anio}-${mesNum}-01T00:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

export function formatFecha(fecha) {
  if (!fecha) return ''
  const valor = fecha.length === 10 ? `${fecha}T00:00:00` : fecha
  return new Date(valor).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatMoneda(monto) {
  if (monto === null || monto === undefined || monto === '') return '$0.00'
  return `$${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
