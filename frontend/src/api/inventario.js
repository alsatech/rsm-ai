import api from './axios'

export const getProductos = (params) => api.get('/api/v1/inventario/productos/', { params })
export const getProducto = (id) => api.get(`/api/v1/inventario/productos/${id}/`)
export const createProducto = (data) => api.post('/api/v1/inventario/productos/', data)
export const updateProducto = (id, data) => api.patch(`/api/v1/inventario/productos/${id}/`, data)
export const getMovimientosProducto = (id) => api.get(`/api/v1/inventario/productos/${id}/movimientos/`)

export const getMovimientos = (params) => api.get('/api/v1/inventario/movimientos/', { params })
export const getMovimiento = (id) => api.get(`/api/v1/inventario/movimientos/${id}/`)
export const createMovimiento = (data) =>
  api.post('/api/v1/inventario/movimientos/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const validarMovimiento = (id, data) => api.patch(`/api/v1/inventario/movimientos/${id}/validar/`, data)

export const getCategorias = () => api.get('/api/v1/inventario/categorias/')
export const getUbicaciones = () => api.get('/api/v1/inventario/ubicaciones/')
export const getAlertasStock = () => api.get('/api/v1/inventario/alertas-stock/')
export const getResumenInventario = () => api.get('/api/v1/inventario/resumen/')

// Adquisiciones — Protocolo de Adquisición, Recepción y Envío de Material (RSM, junio 2026)
export const getSolicitudes = (params) => api.get('/api/v1/inventario/solicitudes/', { params })
export const getSolicitud = (id) => api.get(`/api/v1/inventario/solicitudes/${id}/`)
export const createSolicitud = (data) => api.post('/api/v1/inventario/solicitudes/', data)
export const updateSolicitud = (id, data) => api.patch(`/api/v1/inventario/solicitudes/${id}/`, data)
export const autorizarSolicitud = (id, data) =>
  api.post(`/api/v1/inventario/solicitudes/${id}/autorizar/`, data)
export const rechazarSolicitud = (id, data) =>
  api.post(`/api/v1/inventario/solicitudes/${id}/rechazar/`, data)
export const enviarSolicitud = (id, formData) =>
  api.post(`/api/v1/inventario/solicitudes/${id}/enviar/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const getRecepciones = (solicitudId) =>
  api.get(`/api/v1/inventario/solicitudes/${solicitudId}/recepciones/`)
export const crearRecepcion = (solicitudId, formData) =>
  api.post(`/api/v1/inventario/solicitudes/${solicitudId}/recepciones/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const getComparativoSolicitud = (id) => api.get(`/api/v1/inventario/solicitudes/${id}/comparativo/`)

export const getReportesFaltantes = (params) =>
  api.get('/api/v1/inventario/reportes-faltantes/', { params })
export const createReporteFaltante = (formData) =>
  api.post('/api/v1/inventario/reportes-faltantes/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const resolverReporteFaltante = (id, data) =>
  api.patch(`/api/v1/inventario/reportes-faltantes/${id}/resolver/`, data)
