import api from './axios'

export const getRegistros = (params) => api.get('/api/v1/hidraulica/', { params })

export const createRegistro = (formData) => api.post('/api/v1/hidraulica/', formData)

export const validarRegistro = (id) => api.patch(`/api/v1/hidraulica/${id}/`, { validado: true })
