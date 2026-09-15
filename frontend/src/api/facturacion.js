import api from './axios'

export const getFacturas = (params) => api.get('/api/v1/facturacion/facturas/', { params })
export const getFactura = (id) => api.get(`/api/v1/facturacion/facturas/${id}/`)
export const createFactura = (formData) =>
  api.post('/api/v1/facturacion/facturas/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateFactura = (id, formData) =>
  api.patch(`/api/v1/facturacion/facturas/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteFactura = (id) => api.delete(`/api/v1/facturacion/facturas/${id}/`)
export const getFacturasPorMes = (mes) => api.get('/api/v1/facturacion/facturas/por-mes/', { params: { mes } })

export const getResumenFacturacion = () => api.get('/api/v1/facturacion/resumen/')

export const getRelaciones = () => api.get('/api/v1/facturacion/relaciones/')
export const generarRelacion = (mes) => api.post('/api/v1/facturacion/relaciones/generar/', { mes })

export const getImportables = (modulo) => api.get('/api/v1/facturacion/importar/', { params: { modulo } })
export const importarFacturas = (modulo, ids) => api.post('/api/v1/facturacion/importar/', { modulo, ids })
