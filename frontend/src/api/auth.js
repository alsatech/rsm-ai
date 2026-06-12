import api from './axios'

export const login = (username, password) =>
  api.post('/api/v1/auth/login/', { username, password })

export const getMe = () => api.get('/api/v1/auth/me/')
