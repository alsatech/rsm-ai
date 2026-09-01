export const MONTO_REQUIERE_AUTORIZACION = 50000

export const ESTADO_PROYECTO_CONFIG = {
  borrador: { label: 'Borrador', icon: '📋', badge: 'bg-border/40 text-text-secondary border-border' },
  autorizado: { label: 'Autorizado', icon: '✅', badge: 'bg-highlight/10 text-highlight border-highlight/40' },
  en_progreso: { label: 'En progreso', icon: '🔨', badge: 'bg-warning/10 text-warning border-warning/40' },
  pausado: { label: 'Pausado', icon: '⏸️', badge: 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/40' },
  completado: { label: 'Completado', icon: '✅', badge: 'bg-highlight text-bg border-highlight' },
  cancelado: { label: 'Cancelado', icon: '❌', badge: 'bg-error/10 text-error border-error/40' },
}

export const TABS_ESTADO_PROYECTO = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'autorizado', label: 'Autorizado' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'completado', label: 'Completado' },
]

export const ESTADO_COTIZACION_CONFIG = {
  pendiente: { label: 'Pendiente', badge: 'bg-warning/10 text-warning border-warning/40' },
  aprobada: { label: 'Aprobada', badge: 'bg-highlight/10 text-highlight border-highlight/40' },
  rechazada: { label: 'Rechazada', badge: 'bg-error/10 text-error border-error/40' },
}

export const ESTADO_COMPRA_CONFIG = {
  pendiente_autorizacion: { label: 'Pendiente de autorización', badge: 'bg-error/10 text-error border-error/40' },
  autorizada: { label: 'Autorizada', badge: 'bg-highlight/10 text-highlight border-highlight/40' },
  rechazada: { label: 'Rechazada', badge: 'bg-error/10 text-error border-error/40' },
  en_proceso: { label: 'En proceso', badge: 'bg-warning/10 text-warning border-warning/40' },
  completada: { label: 'Completada', badge: 'bg-highlight text-bg border-highlight' },
}

export const ESPECIALIDADES_SUGERIDAS = ['Albañilería', 'Electricidad', 'Plomería', 'Herrería', 'Carpintería', 'Pintura']

export function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatMoneda(monto) {
  if (monto === null || monto === undefined || monto === '') return '$0'
  return `$${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
