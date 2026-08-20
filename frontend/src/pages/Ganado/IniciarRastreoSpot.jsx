import { useCallback, useEffect, useState } from 'react'

import { crearSpotAsignacion, desactivarSpotAsignacion, getSpotEstado } from '../../api/ganado'
import { useToast } from '../../hooks/useToast'

const TICK_MS = 30 * 1000

function fechaHoraLocal(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function minutosDesde(iso, ahora) {
  if (!iso) return null
  return Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 60000))
}

function textoMinutos(minutos) {
  if (minutos === null) return 'sin datos'
  if (minutos < 1) return 'hace instantes'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  return `hace ${horas}h ${minutos % 60}min`
}

export default function IniciarRastreoSpot() {
  const { showToast } = useToast()
  const [estado, setEstado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ahora, setAhora] = useState(new Date())

  const cargarEstado = useCallback(() => {
    getSpotEstado()
      .then(({ data }) => setEstado(data))
      .catch(() => showToast('No se pudo consultar el estado del rastreo.', 'error'))
      .finally(() => setCargando(false))
  }, [showToast])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  useEffect(() => {
    const interval = setInterval(cargarEstado, TICK_MS)
    return () => clearInterval(interval)
  }, [cargarEstado])

  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  const asignacionActiva = estado?.asignacion_activa

  const handleIniciar = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      showToast('Ponle un título al recorrido.', 'alerta')
      return
    }
    setEnviando(true)
    try {
      await crearSpotAsignacion({ nombre: nombre.trim() })
      setNombre('')
      showToast('Rastreo iniciado 🛰️', 'exito')
      cargarEstado()
    } catch {
      showToast('No se pudo iniciar el rastreo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  const handleTerminar = async () => {
    if (!asignacionActiva) return
    setEnviando(true)
    try {
      await desactivarSpotAsignacion(asignacionActiva.id)
      showToast('Recorrido terminado.', 'exito')
      cargarEstado()
    } catch {
      showToast('No se pudo terminar el recorrido.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center px-4">
        <p className="text-sm text-text-secondary">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[75svh] max-w-md flex-col justify-center gap-6 px-4 py-8">
      {asignacionActiva ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
            <span className="text-4xl">🛰️</span>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">Rastreo en curso</p>
            <p className="mt-1 text-2xl font-bold text-highlight">{asignacionActiva.nombre || 'Sin título'}</p>
            <p className="mt-1 text-sm text-text-secondary">
              Iniciado: {fechaHoraLocal(asignacionActiva.fecha_inicio)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Última señal: {textoMinutos(minutosDesde(estado?.ultima_posicion?.fecha_hora_spot, ahora))}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTerminar}
            disabled={enviando}
            className="w-full rounded-2xl border-2 border-error bg-error/10 py-5 text-xl font-bold text-error transition active:scale-95 disabled:opacity-50"
          >
            🛑 {enviando ? 'Terminando...' : 'Terminar recorrido'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleIniciar} className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-border">
            <span className="text-4xl">🛰️</span>
          </div>
          <div>
            <p className="text-lg font-bold text-text">Iniciar rastreo SPOT</p>
            <p className="mt-1 text-sm text-text-secondary">Ponle un título a tu recorrido para empezar</p>
          </div>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Recorrido potrero norte"
            autoFocus
            className="w-full rounded-2xl border-2 border-border bg-card px-4 py-4 text-center text-lg text-text outline-none focus:border-highlight"
          />
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-2xl bg-accent py-5 text-xl font-bold text-highlight transition active:scale-95 disabled:opacity-50"
          >
            ▶️ {enviando ? 'Iniciando...' : 'Iniciar recorrido'}
          </button>
        </form>
      )}
    </div>
  )
}
