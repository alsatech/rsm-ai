export const TIPO_ICONOS = {
  camioneta: '🛻',
  camion: '🚛',
  moto: '🏍️',
  cuatrimoto: '🏎️',
  utv: '🚙',
  polaris: '🏁',
  can_am: '🏁',
  remolque: '🚚',
  traila: '🚛',
  maquinaria: '🚜',
  plataforma: '🚚',
  van: '🚐',
  otro: '🚗',
}

export const TIPO_LABELS = {
  camioneta: 'Camioneta',
  camion: 'Camión',
  moto: 'Moto',
  cuatrimoto: 'Cuatrimoto',
  utv: 'UTV',
  polaris: 'Polaris',
  can_am: 'CAN AM',
  remolque: 'Remolque',
  traila: 'Traila',
  maquinaria: 'Maquinaria',
  plataforma: 'Plataforma',
  van: 'Van',
  otro: 'Otro',
}

export const ESTADO_VEHICULO_CONFIG = {
  activo: { label: 'Activo', border: 'border-highlight', text: 'text-highlight', bg: 'bg-highlight/10' },
  en_taller: { label: 'En taller', border: 'border-warning', text: 'text-warning', bg: 'bg-warning/10' },
  de_baja: { label: 'De baja', border: 'border-error', text: 'text-error', bg: 'bg-error/10' },
}

export const URGENCIA_CONFIG = {
  critico: { icon: '🔴', label: 'Crítico', border: 'border-error', text: 'text-error', bg: 'bg-error/10' },
  proximo: { icon: '🟡', label: 'Próximo', border: 'border-warning', text: 'text-warning', bg: 'bg-warning/10' },
  preventivo: { icon: '🟢', label: 'Preventivo', border: 'border-highlight', text: 'text-highlight', bg: 'bg-highlight/10' },
}

export const ALERTA_TIPO_LABELS = {
  cambio_aceite: 'Cambio de aceite',
  calibracion_llantas: 'Calibración de llantas',
  vencimiento_tenencia: 'Vencimiento de tenencia',
  vencimiento_placas: 'Vencimiento de placas',
  mantenimiento_general: 'Mantenimiento general',
}

// Placeholder hasta que exista el Módulo 12 — Proyectos (Erik). No se liga a nada todavía.
export const PROYECTOS_PLACEHOLDER = [
  { id: 'cercas', nombre: 'Mantenimiento de cercas' },
  { id: 'caminos', nombre: 'Rehabilitación de caminos' },
  { id: 'hidraulico', nombre: 'Sistema hidráulico' },
  { id: 'bebederos', nombre: 'Construcción de bebederos' },
  { id: 'rcazuela_38', nombre: 'Rcazuela 38' },
  { id: 'rcazuela_35', nombre: 'Rcazuela 35' },
  { id: 'rcazuela_39', nombre: 'Rcazuela 39' },
  { id: 'rcazuela_41', nombre: 'Rcazuela 41' },
  { id: 'general', nombre: 'General / Sin proyecto asignado' },
]

// CAN-AM, Polaris y cuatrimotos: llevan traila al campo, no reportan aceite de
// transmisión y sopletean el filtro de aire (CAN-AM/Polaris además registran horas).
export const TIPOS_OFF_ROAD = ['can_am', 'polaris', 'cuatrimoto']

export function esOffRoad(tipoVehiculo) {
  return TIPOS_OFF_ROAD.includes(tipoVehiculo)
}

// Las motos reales de la reserva están dadas de alta como cuatrimoto (Moto roja, Moto
// azul) — ni motos ni cuatrimotos registran kilometraje ni horómetro, salida o llegada.
export const TIPOS_SIN_KILOMETRAJE = ['moto', 'cuatrimoto']

export function sinKilometraje(tipoVehiculo) {
  return TIPOS_SIN_KILOMETRAJE.includes(tipoVehiculo)
}

export const NIVEL_COMBUSTIBLE_MINIMO_SALIDA = 50

// Ítems booleanos del checklist — cada uno se marca automáticamente al adjuntar su foto de evidencia.
export const CHECKLIST_ITEMS = [
  {
    key: 'nivel_aceite_motor',
    icon: '🛢️',
    label: 'Nivel de aceite motor',
    aplica: (ctx) => ctx.tipoReporte === 'salida',
  },
  {
    key: 'nivel_aceite_transmision',
    icon: '⚙️',
    label: 'Nivel de aceite transmisión',
    aplica: (ctx) => ctx.tipoReporte === 'salida' && !esOffRoad(ctx.tipoVehiculo),
  },
  {
    key: 'anticongelante',
    icon: '🧊',
    label: 'Anticongelante',
    aplica: (ctx) => ctx.tipoReporte === 'salida',
  },
  {
    key: 'soplado_filtro_aire',
    icon: '💨',
    label: 'Sopleteo del filtro de aire',
    aplica: (ctx) => ctx.tipoReporte === 'salida' && esOffRoad(ctx.tipoVehiculo),
  },
  {
    key: 'lavado',
    icon: '🧼',
    label: 'Lavado del vehículo',
    aplica: (ctx) => ctx.tipoReporte === 'llegada',
  },
]

// Kilometraje/horas — no es un simple check, requiere el valor + foto del odómetro/horómetro.
export const KILOMETRAJE_ITEM = { key: 'kilometraje', icon: '🔢', label: 'Kilometraje' }

// Gasolina — se elige como marca el tablero real del vehículo, no un porcentaje.
export const GASOLINA_ITEM = { key: 'gasolina', icon: '⛽', label: 'Gasolina' }

// Color por nivel — de vacío (rojo) a lleno (verde), para diferenciar de un vistazo sin leer.
export const GASOLINA_OPCIONES = [
  { value: 0, label: 'E', color: '#f87171' },
  { value: 25, label: '¼', color: '#fb923c' },
  { value: 50, label: '½', color: '#fbbf24' },
  { value: 75, label: '¾', color: '#a3e635' },
  { value: 100, label: 'F', color: '#4ade80' },
]

// Estado físico — no es un simple check, requiere foto de los 4 costados (+ interior opcional).
export const ESTADO_FISICO_ITEM = { key: 'estado_fisico', icon: '📷', label: 'Estado físico del vehículo' }

export const ESTADO_FISICO_LADOS = [
  { key: 'estado_fisico_derecho', label: 'Derecho' },
  { key: 'estado_fisico_izquierdo', label: 'Izquierdo' },
  { key: 'estado_fisico_frente', label: 'Frente' },
  { key: 'estado_fisico_trasero', label: 'Trasero' },
]

export const ESTADO_FISICO_INTERIOR = { key: 'estado_fisico_interior', label: 'Interior (opcional)' }

// Presión de llantas — no es un simple check, requiere indicar si alguna está baja/ponchada.
export const PRESION_LLANTAS_ITEM = { key: 'presion_llantas', icon: '🛞', label: 'Presión de llantas' }

export const PRESION_LLANTAS_OPCIONES = [
  { value: 'bien', label: 'Presión correcta', icon: '✅' },
  { value: 'delantero_izquierdo', label: 'Delantera izquierda baja', icon: '🛞' },
  { value: 'delantero_derecho', label: 'Delantera derecha baja', icon: '🛞' },
  { value: 'trasero_izquierdo', label: 'Trasera izquierda baja', icon: '🛞' },
  { value: 'trasero_derecho', label: 'Trasera derecha baja', icon: '🛞' },
]

// Carga de la traila — no es un simple check, requiere elegir cuál traila (solo 4x5).
export const CARGA_TRAILA_ITEM = { key: 'carga_traila', icon: '🚚', label: 'Carga de la traila' }
export const MODELO_TRAILA_PERMITIDO = '4x5'

export function esTraila(tipoVehiculo) {
  return tipoVehiculo === 'traila'
}

// Checklist de la traila misma — no tiene motor, combustible ni odómetro:
// solo se revisan las llantas y que esté limpia, sin herramientas y sin carga.
export const TRAILA_ITEMS = [
  { key: 'limpieza', icon: '🧼', label: 'Limpieza de la traila' },
  { key: 'sin_herramientas', icon: '🧰', label: 'Sin herramientas' },
  { key: 'sin_carga', icon: '📦', label: 'Sin carga' },
]

export function itemsAplicables({ tipoReporte, tipoVehiculo }) {
  const ctx = { tipoReporte, tipoVehiculo }
  return CHECKLIST_ITEMS.filter((item) => item.aplica(ctx))
}

// Resume el avance del checklist — estado_fisico, presion_llantas, kilometraje y carga_traila
// se cuentan aparte porque no son simples booleanos (requieren varias fotos, o valor/selección + foto).
// Gasolina queda fuera de este conteo: no lleva foto, se valida aparte (ver Paso2Inspeccion).
export function resumenChecklist({ form, fotos, tipoVehiculo, kilometrajeActual }) {
  const tipoReporte = form.tipo_reporte

  if (esTraila(tipoVehiculo)) {
    const presionCompleto = Boolean(form.presion_llantas) && fotos.some((f) => f.item === 'presion_llantas')
    const verificados =
      (presionCompleto ? 1 : 0) +
      TRAILA_ITEMS.filter((item) => form[item.key]).length
    const total = 1 + TRAILA_ITEMS.length
    return { verificados, total, completo: verificados === total }
  }

  const items = itemsAplicables({ tipoReporte, tipoVehiculo })

  const estadoFisicoCompleto = ESTADO_FISICO_LADOS.every((lado) => fotos.some((f) => f.item === lado.key))
  const presionAplica = tipoReporte === 'salida'
  const presionCompleto = Boolean(form.presion_llantas) && fotos.some((f) => f.item === 'presion_llantas')
  const kilometrajeAplica = !sinKilometraje(tipoVehiculo)
  const kmValido = form.km_reporte !== '' && (kilometrajeActual == null || Number(form.km_reporte) >= kilometrajeActual)
  const kilometrajeCompleto = kmValido && fotos.some((f) => f.item === 'kilometraje')
  const cargaTrailaAplica = esOffRoad(tipoVehiculo)
  const cargaTrailaCompleto = Boolean(form.traila) && fotos.some((f) => f.item === 'carga_traila')

  const verificados =
    items.filter((item) => form[item.key]).length +
    (estadoFisicoCompleto ? 1 : 0) +
    (presionAplica && presionCompleto ? 1 : 0) +
    (kilometrajeAplica && kilometrajeCompleto ? 1 : 0) +
    (cargaTrailaAplica && cargaTrailaCompleto ? 1 : 0)

  const total = items.length + 1 + (presionAplica ? 1 : 0) + (kilometrajeAplica ? 1 : 0) + (cargaTrailaAplica ? 1 : 0)

  return { verificados, total, completo: verificados === total }
}

// Lista ordenada de "casillas" de foto pendientes — para el subidor masivo del paso 2.
// Cada foto que se sube se asigna automáticamente a la siguiente casilla vacía, en este orden.
// Presión de llantas y carga de traila solo aparecen una vez que el usuario ya eligió el estado/traila.
export function fotoSlotsAplicables({ form, tipoVehiculo }) {
  const tipoReporte = form.tipo_reporte

  if (esTraila(tipoVehiculo)) {
    const slots = []
    if (form.presion_llantas) {
      slots.push({ item: 'presion_llantas', icon: PRESION_LLANTAS_ITEM.icon, label: PRESION_LLANTAS_ITEM.label })
    }
    TRAILA_ITEMS.forEach((item) => slots.push({ item: item.key, icon: item.icon, label: item.label }))
    return slots
  }

  const slots = []

  if (!sinKilometraje(tipoVehiculo)) {
    slots.push({
      item: 'kilometraje',
      icon: KILOMETRAJE_ITEM.icon,
      label: esOffRoad(tipoVehiculo) ? 'Horas actuales' : 'Kilometraje actual',
    })
  }

  ESTADO_FISICO_LADOS.forEach((lado) => {
    slots.push({ item: lado.key, icon: '📷', label: `Costado ${lado.label.toLowerCase()}` })
  })

  itemsAplicables({ tipoReporte, tipoVehiculo }).forEach((item) => {
    slots.push({ item: item.key, icon: item.icon, label: item.label })
  })

  if (tipoReporte === 'salida' && form.presion_llantas) {
    slots.push({ item: 'presion_llantas', icon: PRESION_LLANTAS_ITEM.icon, label: PRESION_LLANTAS_ITEM.label })
  }

  if (esOffRoad(tipoVehiculo) && form.traila) {
    slots.push({ item: 'carga_traila', icon: CARGA_TRAILA_ITEM.icon, label: CARGA_TRAILA_ITEM.label })
  }

  return slots
}
