import api from './axios'

export const getProveedores = (params) => api.get('/api/v1/proveedores/', { params })
export const getProveedor = (id) => api.get(`/api/v1/proveedores/${id}/`)
export const createProveedor = (data) => api.post('/api/v1/proveedores/', data)
export const updateProveedor = (id, data) => api.patch(`/api/v1/proveedores/${id}/`, data)
