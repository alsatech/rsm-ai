import axios from 'axios'

import { clearSession, getTokens, setTokens } from './storage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const tokens = getTokens()
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }
  return config
})

let refreshPromise = null

const refreshAccessToken = async () => {
  const tokens = getTokens()
  if (!tokens?.refresh) {
    throw new Error('No hay refresh token')
  }

  const { data } = await axios.post(`${api.defaults.baseURL}/api/v1/auth/refresh/`, {
    refresh: tokens.refresh,
  })

  setTokens({ access: data.access, refresh: tokens.refresh })
  return data.access
}

const handleLogout = () => {
  clearSession()
  window.dispatchEvent(new Event('rsm:logout'))
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    if (response?.status !== 401 || config._retry || config.url?.includes('/auth/')) {
      return Promise.reject(error)
    }

    config._retry = true

    try {
      refreshPromise = refreshPromise || refreshAccessToken()
      const access = await refreshPromise
      refreshPromise = null

      config.headers.Authorization = `Bearer ${access}`
      return api(config)
    } catch (refreshError) {
      refreshPromise = null
      handleLogout()
      return Promise.reject(refreshError)
    }
  }
)

export default api
