import api from './axios'

export const getCorraletas = () => api.get('/api/v1/ganado/corraletas/')
export const getRecorridos = (params) => api.get('/api/v1/ganado/recorridos/', { params })
export const getRecorrido = (id) => api.get(`/api/v1/ganado/recorridos/${id}/`)
export const createRecorrido = (data) => api.post('/api/v1/ganado/recorridos/', data)
export const updateRecorrido = (id, data) => api.patch(`/api/v1/ganado/recorridos/${id}/`, data)
export const deleteRecorrido = (id) => api.delete(`/api/v1/ganado/recorridos/${id}/`)
export const getResumenGanado = () => api.get('/api/v1/ganado/recorridos/resumen/')
export const subirFotoRecorrido = (id, formData) =>
  api.post(`/api/v1/ganado/recorridos/${id}/fotos/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const eliminarFotoRecorrido = (id, fotoId) =>
  api.delete(`/api/v1/ganado/recorridos/${id}/fotos/${fotoId}/`)

export const iniciarRecorrido = (data) => api.post('/api/v1/ganado/recorridos/iniciar/', data)
export const agregarParada = (id, data) =>
  api.post(`/api/v1/ganado/recorridos/${id}/agregar-parada/`, data)
export const eliminarParada = (recorridoId, paradaId) =>
  api.delete(`/api/v1/ganado/recorridos/${recorridoId}/paradas/${paradaId}/`)
export const finalizarRecorrido = (id, data) =>
  api.patch(`/api/v1/ganado/recorridos/${id}/finalizar/`, data)
export const syncParadas = (id, paradas) =>
  api.post(`/api/v1/ganado/recorridos/${id}/sync-paradas/`, { paradas })
export const getHeatmap = (params) => api.get('/api/v1/ganado/heatmap/', { params })

export const getClasificacionCorraletas = (params) =>
  api.get('/api/v1/ganado/corraletas/clasificacion/', { params })

export const getSpotEstado = () => api.get('/api/v1/ganado/spot/estado/')
export const getSpotPosiciones = (params) => api.get('/api/v1/ganado/spot/posiciones/', { params })
export const getSpotAlertas = () => api.get('/api/v1/ganado/spot/alertas/')
export const resolverSpotAlerta = (id) => api.patch(`/api/v1/ganado/spot/alertas/${id}/resolver/`)
export const getSpotAsignaciones = () => api.get('/api/v1/ganado/spot/asignaciones/')
export const crearSpotAsignacion = (data) => api.post('/api/v1/ganado/spot/asignaciones/', data)
export const desactivarSpotAsignacion = (id) =>
  api.patch(`/api/v1/ganado/spot/asignaciones/${id}/desactivar/`)
