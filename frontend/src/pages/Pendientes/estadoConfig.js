export const ESTADO = {
  abierto: {
    icon: '🔴',
    label: 'Abierto',
    badge: 'bg-red-600 text-white',
    borderL: 'border-l-red-500',
    borderColor: 'border-red-500/25',
    textColor: 'text-red-400',
    glowRgba: 'rgba(220, 38, 38, 0.22)',
    tabActive: 'border-red-500 bg-red-500/10 text-red-400',
  },
  en_proceso: {
    icon: '⚡',
    label: 'En proceso',
    badge: 'bg-blue-600 text-white',
    borderL: 'border-l-blue-500',
    borderColor: 'border-blue-500/25',
    textColor: 'text-blue-400',
    glowRgba: 'rgba(59, 130, 246, 0.22)',
    tabActive: 'border-blue-500 bg-blue-500/10 text-blue-400',
  },
  bloqueado: {
    icon: '🔒',
    label: 'Bloqueado',
    badge: 'bg-orange-600 text-white',
    borderL: 'border-l-orange-500',
    borderColor: 'border-orange-500/25',
    textColor: 'text-orange-400',
    glowRgba: 'rgba(249, 115, 22, 0.22)',
    tabActive: 'border-orange-500 bg-orange-500/10 text-orange-400',
  },
  cerrado: {
    icon: '✅',
    label: 'Terminado',
    badge: 'bg-emerald-700 text-white',
    borderL: 'border-l-emerald-500',
    borderColor: 'border-emerald-500/25',
    textColor: 'text-emerald-400',
    glowRgba: 'rgba(16, 185, 129, 0.22)',
    tabActive: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  },
}

export const PRIORIDAD = {
  baja: { icon: '▼', badge: 'bg-zinc-800 text-zinc-400' },
  media: { icon: '●', badge: 'bg-blue-900/50 text-blue-300' },
  alta: { icon: '▲', badge: 'bg-orange-900/50 text-orange-300' },
  urgente: { icon: '‼', badge: 'bg-red-600 text-white animate-pulse' },
}

export const MODULO_ICON = {
  hidraulica: '💧',
  flota: '🚗',
  inventario: '📦',
  proyectos: '🏗️',
  personal: '👥',
  ninguno: null,
}

export const ORIGEN_ICON = {
  junta: '📋',
  campo: '🌿',
  administracion: '🏢',
  sistema: '⚙️',
}
