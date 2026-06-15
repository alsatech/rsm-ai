import api from './axios'

export const getRegistros = (params) => api.get('/api/v1/hidraulica/', { params })

export const createRegistro = (formData) => api.post('/api/v1/hidraulica/', formData)

export const validarRegistro = (id) => api.patch(`/api/v1/hidraulica/${id}/`, { validado: true })

export const getGeneradores = () => api.get('/api/v1/hidraulica/generadores/')

export const actualizarHorasGenerador = (id, horasOperacion) =>
  api.patch(`/api/v1/hidraulica/generadores/${id}/`, { horas_operacion: horasOperacion })

export const getChecklistGenerador = (id) => api.get(`/api/v1/hidraulica/generadores/${id}/checklist/`)

export const crearChecklistGenerador = (id, data) =>
  api.post(`/api/v1/hidraulica/generadores/${id}/checklist/`, data)
