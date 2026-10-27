export function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function formatFecha(fecha) {
  if (!fecha) return ''
  const valor = fecha.length === 10 ? `${fecha}T00:00:00` : fecha
  return new Date(valor).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatHora(fechaHora) {
  if (!fechaHora) return ''
  return new Date(fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export const ESTADO_HIDRAULICA_COLOR = {
  normal: 'text-highlight',
  alerta: 'text-yellow-400',
  falla: 'text-error',
}
