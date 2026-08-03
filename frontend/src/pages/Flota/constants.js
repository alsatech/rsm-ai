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
  activo: { label: 'Activo', border: 'border-highlight/40', text: 'text-highlight', bg: 'bg-highlight/15' },
  en_taller: { label: 'En taller', border: 'border-warning/40', text: 'text-warning', bg: 'bg-warning/15' },
  de_baja: { label: 'De baja', border: 'border-error/40', text: 'text-error', bg: 'bg-error/15' },
}

export const URGENCIA_CONFIG = {
  critico: { icon: '🔴', label: 'Crítico', border: 'border-error/40', text: 'text-error', bg: 'bg-error/15' },
  proximo: { icon: '🟡', label: 'Próximo', border: 'border-warning/40', text: 'text-warning', bg: 'bg-warning/15' },
  preventivo: { icon: '🟢', label: 'Preventivo', border: 'border-highlight/40', text: 'text-highlight', bg: 'bg-highlight/15' },
}

export const ALERTA_TIPO_LABELS = {
  cambio_aceite: 'Cambio de aceite',
  calibracion_llantas: 'Calibración de llantas',
  vencimiento_tenencia: 'Vencimiento de tenencia',
  vencimiento_placas: 'Vencimiento de placas',
  mantenimiento_general: 'Mantenimiento general',
}

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

// Kilometraje/horas — se sube como foto del tablero, el número es informativo.
// Solo se usa en SALIDAS (en llegadas se unifica con gasolina en TABLERO_ITEM).
export const KILOMETRAJE_ITEM = { key: 'kilometraje', icon: '🔢', label: 'Kilometraje' }

// Gasolina — la aguja del tablero se captura en una foto, no se elige con un botón.
// Solo se usa en SALIDAS (en llegadas se unifica con kilometraje en TABLERO_ITEM).
export const GASOLINA_ITEM = { key: 'gasolina', icon: '⛽', label: 'Gasolina' }

// Foto única del tablero — obligatoria en LLEGADAS. Cubre kilometraje/horas + gasolina.
export const TABLERO_ITEM = { key: 'tablero', icon: '⛽', label: 'Tablero (km + gasolina)' }

// Placeholder hasta que exista el Módulo 12 — Proyectos (Erik). Texto libre que
// se persiste en `ChecklistVehiculo.proyecto`. La llegada toma el proyecto por
// transitividad de la salida vinculada, así que no se pide en el flujo de llegada.
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

// Estado físico — no es un simple check, requiere foto de los 4 costados (+ interior opcional).
export const ESTADO_FISICO_ITEM = { key: 'estado_fisico', icon: '📷', label: 'Estado físico del vehículo' }

export const ESTADO_FISICO_LADOS = [
  { key: 'estado_fisico_derecho', label: 'Derecho' },
  { key: 'estado_fisico_izquierdo', label: 'Izquierdo' },
  { key: 'estado_fisico_frente', label: 'Frente' },
  { key: 'estado_fisico_trasero', label: 'Trasero' },
]

export const ESTADO_FISICO_INTERIOR = { key: 'estado_fisico_interior', label: 'Interior (opcional)' }

// Llantas / neumáticos — se sube una foto de cada llanta en mal estado, sin selección.
export const PRESION_LLANTAS_ITEM = { key: 'presion_llantas', icon: '🛞', label: 'Llantas / neumáticos' }

// Incidencia previa (salida) — el usuario reporta daños que el vehículo ya traía para deslindarse.
export const INCIDENCIA_PREVIA_ITEM = { key: 'incidencia_previa', icon: '⚠️', label: 'Daño preexistente' }

// Incidencia nueva (llegada) — el usuario reporta daños/choques ocurridos durante el uso.
export const INCIDENCIA_NUEVA_ITEM = { key: 'incidencia_nueva', icon: '🚨', label: 'Daño nuevo / choque' }

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

// Resume el avance del checklist — estado_fisico, kilometraje, carga_traila y la incidencia
// (cuando aplica) se cuentan aparte porque no son simples booleanos (requieren foto).
// Kilometraje es informativo: solo se requiere la foto del tablero.
// Incidencia es opcional pero bloquea si hay texto sin foto: si escribió, debe subir foto.
export function resumenChecklist({ form, fotos, tipoVehiculo, kilometrajeActual }) {
  const tipoReporte = form.tipo_reporte

  if (esTraila(tipoVehiculo)) {
    const verificados = TRAILA_ITEMS.filter((item) => form[item.key]).length
    const total = TRAILA_ITEMS.length
    return { verificados, total, completo: verificados === total }
  }

  const items = itemsAplicables({ tipoReporte, tipoVehiculo })

  const estadoFisicoCompleto = ESTADO_FISICO_LADOS.every((lado) => fotos.some((f) => f.item === lado.key))
  const interiorCompleto = fotos.some((f) => f.item === ESTADO_FISICO_INTERIOR.key)  // interior — opcional
  const esSalidaReporte = tipoReporte === 'salida'

  // Tablero / km / gasolina: en salida el usuario sube 2 fotos (km + gasolina);
  // en llegada, una sola foto del tablero cubre ambos.
  const tableroCompleto = fotos.some((f) => f.item === TABLERO_ITEM.key)
  const kilometrajeAplica = !sinKilometraje(tipoVehiculo)
  const kilometrajeCompleto = esSalidaReporte && kilometrajeAplica && fotos.some((f) => f.item === 'kilometraje')
  const gasolinaCompleto = esSalidaReporte && fotos.some((f) => f.item === 'gasolina')

  const cargaTrailaAplica = esOffRoad(tipoVehiculo)
  const cargaTrailaCompleto = Boolean(form.traila) && fotos.some((f) => f.item === 'carga_traila')
  // Llantas: solo se exige en salidas. En llegadas no bloquea.
  const llantasCompleto = esSalidaReporte && fotos.some((f) => f.item === 'presion_llantas')

  // Incidencias: si escribió texto sin foto, queda bloqueado. Si no escribió nada, no bloquea.
  const itemIncidencia = tipoReporte === 'salida' ? 'incidencia_previa' : 'incidencia_nueva'
  const incidenciaTexto = (form[itemIncidencia] ?? '').trim()
  const incidenciaFoto = fotos.some((f) => f.item === itemIncidencia)
  const incidenciaBloqueada = Boolean(incidenciaTexto) && !incidenciaFoto
  const incidenciaCompleta = !incidenciaBloqueada && (incidenciaFoto || !incidenciaTexto)

  // Total de obligatorios depende del tipo de reporte:
  //  - salida: items + estado_fisico + (km) + gasolina + llantas + (traila) + incidencia = 5 base
  //  - llegada: items + estado_fisico + tablero + (traila) + incidencia = 4 base
  // Interior y bonificaciones se cuentan aparte, como antes.
  const baseObligatorios = esSalidaReporte
    ? 3 + (kilometrajeAplica ? 1 : 0) + 1 + 1 // estado_fisico, gasolina, llantas, [km]
    : 2 + 1 // estado_fisico, tablero

  const verificados =
    items.filter((item) => form[item.key]).length +
    (estadoFisicoCompleto ? 1 : 0) +
    (interiorCompleto ? 1 : 0) +
    (esSalidaReporte
      ? (kilometrajeAplica && kilometrajeCompleto ? 1 : 0)
        + (gasolinaCompleto ? 1 : 0)
        + (llantasCompleto ? 1 : 0)
      : (tableroCompleto ? 1 : 0)) +
    (cargaTrailaAplica && cargaTrailaCompleto ? 1 : 0) +
    (incidenciaCompleta ? 1 : 0)

  const total = items.length + baseObligatorios + (cargaTrailaAplica ? 1 : 0)

  const completo = !incidenciaBloqueada && verificados >= total
  return { verificados, total, completo, incidenciaBloqueada }
}

// Lista ordenada de "casillas" de foto pendientes — para el subidor masivo del paso 2.
// Cada foto que se sube se asigna automáticamente a la siguiente casilla vacía, en este orden.
// La casilla de incidencia aparece cuando el usuario escribió texto en el textarea correspondiente.
export function fotoSlotsAplicables({ form, tipoVehiculo }) {
  const tipoReporte = form.tipo_reporte

  if (esTraila(tipoVehiculo)) {
    return TRAILA_ITEMS.map((item) => ({ item: item.key, icon: item.icon, label: item.label }))
  }

  const slots = []

  if (tipoReporte === 'salida') {
    if (!sinKilometraje(tipoVehiculo)) {
      slots.push({
        item: 'kilometraje',
        icon: KILOMETRAJE_ITEM.icon,
        label: esOffRoad(tipoVehiculo) ? 'Horas actuales (foto del tablero)' : 'Kilometraje actual (foto del tablero)',
      })
    }
    // Gasolina — se sube como foto del tablero (solo en salidas; en llegadas va con km en `tablero`).
    slots.push({ item: 'gasolina', icon: GASOLINA_ITEM.icon, label: 'Gasolina (foto del tablero)' })
  } else {
    // Llegada — una sola foto del tablero cubre kilometraje + gasolina.
    slots.push({
      item: TABLERO_ITEM.key,
      icon: TABLERO_ITEM.icon,
      label: esOffRoad(tipoVehiculo)
        ? 'Horas + gasolina (foto del tablero)'
        : 'Kilometraje + gasolina (foto del tablero)',
    })
  }

  ESTADO_FISICO_LADOS.forEach((lado) => {
    slots.push({ item: lado.key, icon: '📷', label: `Costado ${lado.label.toLowerCase()}` })
  })
  slots.push({ item: ESTADO_FISICO_INTERIOR.key, icon: '📷', label: 'Interior (opcional)' })

  // Llantas / neumáticos — solo se piden al sacar el vehículo; en llegadas ya no se exige.
  if (tipoReporte === 'salida') {
    slots.push({ item: PRESION_LLANTAS_ITEM.item, icon: PRESION_LLANTAS_ITEM.icon, label: 'Llantas / neumáticos (foto si alguna está baja)' })
  }

  itemsAplicables({ tipoReporte, tipoVehiculo }).forEach((item) => {
    slots.push({ item: item.key, icon: item.icon, label: item.label })
  })

  // Incidencia — solo aparece cuando el usuario escribió algo en el textarea.
  if (tipoReporte === 'salida' && (form.incidencia_previa ?? '').trim()) {
    slots.push({
      item: INCIDENCIA_PREVIA_ITEM.key,
      icon: INCIDENCIA_PREVIA_ITEM.icon,
      label: 'Foto del daño preexistente',
    })
  }
  if (tipoReporte === 'llegada' && (form.incidencia_nueva ?? '').trim()) {
    slots.push({
      item: INCIDENCIA_NUEVA_ITEM.key,
      icon: INCIDENCIA_NUEVA_ITEM.icon,
      label: 'Foto del daño / choque',
    })
  }

  if (esOffRoad(tipoVehiculo) && form.traila) {
    slots.push({ item: 'carga_traila', icon: CARGA_TRAILA_ITEM.icon, label: CARGA_TRAILA_ITEM.label })
  }

  return slots
}
