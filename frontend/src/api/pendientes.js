import api from './axios'

export const getPendientes = (params) => api.get('/api/v1/pendientes/', { params })
export const createPendiente = (data) => api.post('/api/v1/pendientes/', data)
export const getPendiente = (id) => api.get(`/api/v1/pendientes/${id}/`)
export const updatePendiente = (id, data) => api.patch(`/api/v1/pendientes/${id}/`, data)
export const getHistorial = (id) => api.get(`/api/v1/pendientes/${id}/historial/`)
export const cambiarEstado = (id, data) => api.post(`/api/v1/pendientes/${id}/cambiar-estado/`, data)
export const getResumen = () => api.get('/api/v1/pendientes/resumen/')
export const subirFoto = (id, formData) => api.post(`/api/v1/pendientes/${id}/fotos/`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const eliminarPendiente = (id) => api.delete(`/api/v1/pendientes/${id}/`)
export const eliminarFoto = (id, fotoId) => api.delete(`/api/v1/pendientes/${id}/fotos/${fotoId}/`)
export const getUsuarios = () => api.get('/api/v1/auth/usuarios/')
