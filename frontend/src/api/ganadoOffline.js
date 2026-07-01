const STORAGE_KEY = 'rsm_recorrido_activo'
const CORRALETAS_CACHE_KEY = 'rsm_corraletas_cache'

export function guardarRecorridoLocal(recorrido) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...recorrido,
    ultima_actualizacion: new Date().toISOString(),
  }))
}

export function getRecorridoLocal() {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : null
}

export function agregarParadaLocal(parada) {
  const recorrido = getRecorridoLocal()
  if (!recorrido) return null
  const paradas = recorrido.paradas || []
  const nuevaParada = {
    ...parada,
    orden: paradas.length + 1,
    timestamp: new Date().toISOString(),
  }
  paradas.push(nuevaParada)
  guardarRecorridoLocal({ ...recorrido, paradas })
  return nuevaParada
}

export function deshacerUltimaParadaLocal() {
  const recorrido = getRecorridoLocal()
  if (!recorrido || !recorrido.paradas?.length) return []
  const paradas = recorrido.paradas.slice(0, -1)
  guardarRecorridoLocal({ ...recorrido, paradas })
  return paradas
}

export function limpiarRecorridoLocal() {
  localStorage.removeItem(STORAGE_KEY)
}

export function guardarCorraletasCache(corraletas) {
  localStorage.setItem(CORRALETAS_CACHE_KEY, JSON.stringify(corraletas))
}

export function getCorraletasCache() {
  const data = localStorage.getItem(CORRALETAS_CACHE_KEY)
  return data ? JSON.parse(data) : []
}
