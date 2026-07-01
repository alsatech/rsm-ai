import { useEffect, useState } from 'react'

import { iniciarRecorrido } from '../../../api/ganado'
import { getRecorridoLocal, guardarRecorridoLocal } from '../../../api/ganadoOffline'
import { getUsuarios } from '../../../api/pendientes'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { COLOR_LABELS, COLOR_MAP } from './colorConfig'

const hoy = new Date().toISOString().split('T')[0]
const COLORES = Object.keys(COLOR_MAP)

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function PantallaIniciar({ onVolver, onIniciado }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [pendienteLocal] = useState(() => getRecorridoLocal())
  const [fecha, setFecha] = useState(hoy)
  const [color, setColor] = useState('azul_claro')
  const [asistentes, setAsistentes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [iniciando, setIniciando] = useState(false)

  useEffect(() => {
    getUsuarios().then(({ data }) => setUsuarios(data)).catch(() => {})
  }, [])

  const otrosUsuarios = usuarios.filter((u) => u.username !== user?.username)

  const toggleAsistente = (id) => {
    setAsistentes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  const handleIniciar = async () => {
    setIniciando(true)
    try {
      const { data } = await iniciarRecorrido({ fecha, color, asistentes })
      const local = {
        id: data.id,
        fecha: data.fecha,
        color: data.color,
        asistentes,
        paradas: [],
        iniciado_en: data.hora_inicio,
        pendiente_creacion: false,
        pendiente_sync: false,
        fase: 'en_curso',
      }
      guardarRecorridoLocal(local)
      onIniciado(local)
    } catch (err) {
      if (!err.response) {
        const local = {
          id: null,
          fecha,
          color,
          asistentes,
          paradas: [],
          iniciado_en: new Date().toISOString(),
          pendiente_creacion: true,
          pendiente_sync: false,
          fase: 'en_curso',
        }
        guardarRecorridoLocal(local)
        showToast('📵 Sin señal — el recorrido se guardó en este dispositivo.', 'alerta')
        onIniciado(local)
      } else {
        const msg = err.response?.data?.detail || 'No se pudo iniciar el recorrido.'
        showToast(msg, 'error')
      }
    } finally {
      setIniciando(false)
    }
  }

  if (pendienteLocal) {
    const esCierre = pendienteLocal.fase === 'cerrando'
    return (
      <div className="min-h-svh bg-bg">
        <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVolver}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-xl text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </button>
            <h1 className="text-lg font-bold text-highlight">Recorrido</h1>
          </div>
        </header>

        <div className="px-4 py-8">
          <div className="rounded-2xl border-2 border-warning bg-card px-4 py-5">
            <p className="mb-1 text-lg font-bold text-warning">
              ⚠️ Tienes un recorrido pendiente {esCierre ? 'de cerrar' : 'de sincronizar'}
            </p>
            <p className="mb-4 text-sm text-text-secondary">
              {esCierre
                ? 'Ya se sincronizaron las paradas. Falta completar los datos de cierre.'
                : `Iniciado a las ${formatHora(pendienteLocal.iniciado_en)} con ${pendienteLocal.paradas?.length ?? 0} parada(s) guardadas en este dispositivo.`}
            </p>
            <button
              type="button"
              onClick={() => onIniciado(pendienteLocal)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-lg font-bold text-bg transition hover:opacity-90"
            >
              Continuar →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-xl text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-highlight">Nuevo Recorrido</h1>
            <p className="text-sm text-text-secondary">Completa los datos y presiona Iniciar</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-8">
        {/* Hero */}
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-6xl">🐄</span>
          <p className="text-base font-semibold text-text-secondary">¿Listo para salir?</p>
        </div>

        {/* Fecha */}
        <div>
          <label className="mb-2 block text-base font-bold text-text">
            📅 Fecha del recorrido
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-4 text-base text-text focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-3 block text-base font-bold text-text">
            🎨 Color del recorrido
          </label>
          <div className="grid grid-cols-3 gap-3">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-3 transition ${
                  color === c
                    ? 'border-highlight bg-card scale-105'
                    : 'border-border hover:border-accent'
                }`}
              >
                <span
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: COLOR_MAP[c] }}
                />
                <span className="text-xs font-medium text-text-secondary">
                  {COLOR_LABELS[c]}
                  {color === c && ' ✓'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Asistentes */}
        {otrosUsuarios.length > 0 && (
          <div>
            <label className="mb-3 block text-base font-bold text-text">
              👥 ¿Quién más va? <span className="font-normal text-text-secondary">(opcional)</span>
            </label>
            <div className="space-y-2">
              {otrosUsuarios.map((u) => {
                const sel = asistentes.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAsistente(u.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                      sel
                        ? 'border-highlight bg-accent text-highlight'
                        : 'border-border text-text hover:border-accent'
                    }`}
                  >
                    <span className="text-2xl">{sel ? '✅' : '👤'}</span>
                    <span className="text-base font-semibold">{u.nombre}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botón grande */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-5">
        <button
          type="button"
          onClick={handleIniciar}
          disabled={iniciando}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-highlight py-5 text-xl font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {iniciando
            ? <><span className="animate-spin text-2xl">⏳</span> Iniciando...</>
            : <><span className="text-2xl">🚀</span> ¡Iniciar recorrido!</>
          }
        </button>
      </div>
      <div className="h-32" />
    </div>
  )
}
