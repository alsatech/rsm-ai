import api from './axios'

export const getProyectos = (params) => api.get('/api/v1/proyectos/proyectos/', { params })
export const getProyecto = (id) => api.get(`/api/v1/proyectos/proyectos/${id}/`)
export const createProyecto = (data) => api.post('/api/v1/proyectos/proyectos/', data)
export const updateProyecto = (id, data) => api.patch(`/api/v1/proyectos/proyectos/${id}/`, data)
export const autorizarProyecto = (id, data) => api.post(`/api/v1/proyectos/proyectos/${id}/autorizar/`, data)
export const rechazarProyecto = (id, data) => api.post(`/api/v1/proyectos/proyectos/${id}/rechazar/`, data)
export const getResumenProyectos = () => api.get('/api/v1/proyectos/resumen/')
export const getUsuarios = () => api.get('/api/v1/auth/usuarios/')

// Cotizaciones de mano de obra
export const getCotizaciones = (proyectoId) => api.get(`/api/v1/proyectos/proyectos/${proyectoId}/cotizaciones/`)
export const createCotizacion = (proyectoId, formData) =>
  api.post(`/api/v1/proyectos/proyectos/${proyectoId}/cotizaciones/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const aprobarCotizacion = (proyectoId, cotizacionId, data) =>
  api.patch(`/api/v1/proyectos/proyectos/${proyectoId}/cotizaciones/${cotizacionId}/aprobar/`, data)

// Compras del proyecto
export const getComprasProyecto = (proyectoId) => api.get(`/api/v1/proyectos/proyectos/${proyectoId}/compras/`)
export const createCompraProyecto = (proyectoId, formData) =>
  api.post(`/api/v1/proyectos/proyectos/${proyectoId}/compras/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const autorizarCompraProyecto = (proyectoId, compraId, data) =>
  api.patch(`/api/v1/proyectos/proyectos/${proyectoId}/compras/${compraId}/autorizar/`, data)

// Avances
export const getAvancesProyecto = (proyectoId) => api.get(`/api/v1/proyectos/proyectos/${proyectoId}/avances/`)
export const createAvanceProyecto = (proyectoId, formData) =>
  api.post(`/api/v1/proyectos/proyectos/${proyectoId}/avances/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Inventario propio del proyecto
export const getInventarioProyecto = (proyectoId) => api.get(`/api/v1/proyectos/proyectos/${proyectoId}/inventario/`)
export const createItemProyecto = (proyectoId, data) =>
  api.post(`/api/v1/proyectos/proyectos/${proyectoId}/inventario/`, data)
export const registrarMovimientoItem = (proyectoId, itemId, data) =>
  api.post(`/api/v1/proyectos/proyectos/${proyectoId}/inventario/${itemId}/movimiento/`, data)
export const devolverItemAlInventario = (proyectoId, itemId, data) =>
  api.post(`/api/v1/proyectos/proyectos/${proyectoId}/inventario/${itemId}/devolver/`, data)

// Contratistas
export const getContratistas = (params) => api.get('/api/v1/proyectos/contratistas/', { params })
export const getContratista = (id) => api.get(`/api/v1/proyectos/contratistas/${id}/`)
export const createContratista = (data) => api.post('/api/v1/proyectos/contratistas/', data)
export const updateContratista = (id, data) => api.patch(`/api/v1/proyectos/contratistas/${id}/`, data)

// Catálogo general de inventario (para buscar/vincular material al alta del ítem de proyecto)
export const getProductosInventario = (params) => api.get('/api/v1/inventario/productos/', { params })
