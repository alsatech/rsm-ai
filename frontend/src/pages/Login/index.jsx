import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

export default function Login() {
  const { login, loading, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      await login(username, password)
      showToast('Sesión iniciada correctamente', 'exito')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const mensaje =
        err.response?.data?.detail || 'Usuario o contraseña incorrectos'
      setError(mensaje)
      showToast(mensaje, 'error')
    }
  }

  return (
    <div
      className="relative flex min-h-svh items-center justify-center px-4"
      style={{
        backgroundImage: "url('/assets/logos/fongologin.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay oscuro para contraste */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-black/70 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img
            src="/assets/logos/logoRSM.png"
            alt="RSM"
            className="h-28 w-auto"
            style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-highlight">RSM Sistema</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Reserva Santa Margarita — Gestión Operativa
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-text-secondary">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-text outline-none focus:border-highlight"
              placeholder="tu.usuario"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-text outline-none focus:border-highlight"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-error bg-bg px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-accent px-4 py-3 font-bold text-text transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
