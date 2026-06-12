import { createContext, useContext, useEffect, useState } from 'react'

import { login as loginRequest } from '../api/auth'
import { clearSession, getTokens, getUser, setTokens, setUser } from '../api/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getUser())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onLogout = () => setUserState(null)
    window.addEventListener('rsm:logout', onLogout)
    return () => window.removeEventListener('rsm:logout', onLogout)
  }, [])

  const login = async (username, password) => {
    setLoading(true)
    try {
      const { data } = await loginRequest(username, password)
      setTokens({ access: data.access, refresh: data.refresh })

      const perfil = { username, nombre: data.nombre, rol: data.rol }
      setUser(perfil)
      setUserState(perfil)

      return perfil
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearSession()
    setUserState(null)
  }

  const isAuthenticated = Boolean(user && getTokens()?.access)

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
