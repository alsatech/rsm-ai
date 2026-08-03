import api from './axios'

export const getUsuarios = () => api.get('/api/v1/auth/usuarios/')

export const getVehiculos = () => api.get('/api/v1/flota/vehiculos/')
export const getVehiculo = (id) => api.get(`/api/v1/flota/vehiculos/${id}/`)
export const createVehiculo = (data) =>
  api.post('/api/v1/flota/vehiculos/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const updateVehiculo = (id, data) =>
  api.patch(`/api/v1/flota/vehiculos/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const deleteVehiculo = (id) => api.delete(`/api/v1/flota/vehiculos/${id}/`)
export const getHistorialVehiculo = (id) => api.get(`/api/v1/flota/vehiculos/${id}/historial/`)

export const getChecklists = (params) => api.get('/api/v1/flota/checklists/', { params })
export const getChecklist = (id) => api.get(`/api/v1/flota/checklists/${id}/`)
export const createChecklist = (data) => api.post('/api/v1/flota/checklists/', data)
// Salidas del vehículo del día indicado que aún no tienen llegada vinculada — opciones
// para cerrar en una llegada.
export const getSalidasPendientes = (params) =>
  api.get('/api/v1/flota/checklists/salidas-pendientes/', { params })
export const validarChecklist = (id, data) => api.patch(`/api/v1/flota/checklists/${id}/`, data)
export const subirFotoChecklist = (id, formData) =>
  api.post(`/api/v1/flota/checklists/${id}/fotos/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const eliminarFotoChecklist = (id, fotoId) =>
  api.delete(`/api/v1/flota/checklists/${id}/fotos/${fotoId}/`)
// Sube una nota de voz (estilo WhatsApp) al checklist. formData debe traer `audio` (Blob/File)
// y, opcionalmente, `duracion_segundos` y `descripcion`.
export const subirAudioChecklist = (id, formData) =>
  api.post(`/api/v1/flota/checklists/${id}/audios/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const eliminarAudioChecklist = (id, audioId) =>
  api.delete(`/api/v1/flota/checklists/${id}/audios/${audioId}/`)
export const crearAdvertenciaChecklist = (id, data) =>
  api.post(`/api/v1/flota/checklists/${id}/advertencias/`, data)

export const getAlertasFlota = (params) => api.get('/api/v1/flota/alertas/', { params })
export const resolverAlertaFlota = (id, data) =>
  api.patch(`/api/v1/flota/alertas/${id}/resolver/`, data)

export const getIncidencias = (params) => api.get('/api/v1/flota/incidencias/', { params })

export const getResumenFlota = () => api.get('/api/v1/flota/resumen/')
