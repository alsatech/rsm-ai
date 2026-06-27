import { useEffect, useState } from 'react'

import { iniciarRecorrido } from '../../../api/ganado'
import { getUsuarios } from '../../../api/pendientes'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { COLOR_LABELS, COLOR_MAP } from './colorConfig'

const hoy = new Date().toISOString().split('T')[0]
const COLORES = Object.keys(COLOR_MAP)

export default function PantallaIniciar({ onVolver, onIniciado }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [fecha, setFecha] = useState(hoy)
  const [color, setColor] = useState('azul_claro')
  const [asistentes, setAsistentes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [iniciando, setIniciando] = useState(false)

  useEffect(() => {
    getUsuarios()
      .then(({ data }) => setUsuarios(data))
      .catch(() => {})
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
      onIniciado(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo iniciar el recorrido.'
      showToast(msg, 'error')
    } finally {
      setIniciando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Nuevo recorrido</h1>
            <p className="text-xs text-text-secondary">Datos iniciales</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Fecha */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-text focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Color del recorrido
          </label>
          <div className="flex flex-wrap gap-3">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={COLOR_LABELS[c]}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  color === c ? 'border-text scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: COLOR_MAP[c] }}
              >
                {color === c && <span className="text-sm font-bold text-bg">✓</span>}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-secondary">{COLOR_LABELS[color]}</p>
        </div>

        {/* Asistentes */}
        {otrosUsuarios.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              Asistentes <span className="text-xs opacity-60">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {otrosUsuarios.map((u) => {
                const sel = asistentes.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAsistente(u.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      sel
                        ? 'border-highlight bg-accent text-highlight'
                        : 'border-border text-text-secondary hover:border-accent'
                    }`}
                  >
                    {u.nombre}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-4">
        <button
          type="button"
          onClick={handleIniciar}
          disabled={iniciando}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-5 text-lg font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
        >
          {iniciando ? (
            <><span className="animate-spin">⏳</span> Iniciando...</>
          ) : (
            'Iniciar recorrido'
          )}
        </button>
      </div>
      <div className="h-28" />
    </div>
  )
}
