import api from './axios'

export const getMinutas = () => api.get('/api/v1/minuta/')
export const getMinutaDetalle = (fecha) => api.get(`/api/v1/minuta/${fecha}/`)
export const generarMinuta = (fecha, notas) => api.post(`/api/v1/minuta/${fecha}/generar/`, { notas })

// El endpoint requiere JWT, así que se descarga vía axios (no un <a href> plano) para
// que el interceptor le agregue el Authorization header.
export const descargarMinutaPdf = (fecha) => api.get(`/api/v1/minuta/${fecha}/pdf/`, { responseType: 'blob' })
