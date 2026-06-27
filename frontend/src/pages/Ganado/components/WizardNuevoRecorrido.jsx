import { useEffect, useState } from 'react'

import { getMe } from '../../../api/auth'
import { createRecorrido, getCorraletas, subirFotoRecorrido } from '../../../api/ganado'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import Paso1Info from './Paso1Info'
import Paso2Corraletas from './Paso2Corraletas'
import Paso3Fotos from './Paso3Fotos'

const hoy = new Date().toISOString().split('T')[0]

function estadoInicial(userId) {
  return {
    fecha: hoy,
    responsable: userId,
    asistentes: [],
    numero_cabezas: '',
    estado_hato: '',
    color: 'azul_claro',
    narrativa: '',
    observaciones: '',
  }
}

export default function WizardNuevoRecorrido({ onVolver, onGuardado }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState(() => estadoInicial(user?.id))
  const [paradas, setParadas] = useState([])
  const [fotos, setFotos] = useState([])
  const [corraletas, setCorraletas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getCorraletas()
      .then(({ data }) => setCorraletas(data))
      .catch(() => showToast('No se pudo cargar el catálogo de corraletas.', 'error'))
    // Obtener el id real del usuario (no está en el perfil almacenado en localStorage)
    getMe()
      .then(({ data }) => {
        setUserId(data.id)
        setForm((f) => ({ ...f, responsable: data.id }))
      })
      .catch(() => {})
  }, [showToast])

  const handleChange = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  const handleAgregarCorraleta = (corraleta) => {
    if (paradas.some((p) => p.id === corraleta.id)) return
    setParadas((prev) => [...prev, corraleta])
  }

  const handleQuitarUltima = () => {
    setParadas((prev) => prev.slice(0, -1))
  }

  const validarPaso1 = () => {
    if (!form.estado_hato) return 'Selecciona el estado del hato.'
    if (!form.narrativa.trim()) return 'Escribe la narrativa del recorrido.'
    return ''
  }

  const validarPaso2 = () => {
    if (paradas.length < 2) return 'Selecciona al menos 2 corraletas.'
    return ''
  }

  const irAPaso = (n) => {
    setErrorMsg('')
    if (n === 2) {
      const err = validarPaso1()
      if (err) { setErrorMsg(err); return }
    }
    if (n === 3) {
      const err = validarPaso2()
      if (err) { setErrorMsg(err); return }
    }
    setPaso(n)
  }

  const handleGuardar = async () => {
    setGuardando(true)
    setErrorMsg('')
    try {
      const payload = {
        fecha: form.fecha,
        responsable: form.responsable,
        asistentes: form.asistentes,
        numero_cabezas: form.numero_cabezas ? parseInt(form.numero_cabezas) : null,
        estado_hato: form.estado_hato,
        color: form.color,
        narrativa: form.narrativa.trim(),
        observaciones: form.observaciones.trim(),
        paradas: paradas.map((p, i) => ({ corraleta: p.id, orden: i + 1 })),
      }
      const { data: recorrido } = await createRecorrido(payload)

      for (const f of fotos) {
        const fd = new FormData()
        fd.append('foto', f.file)
        await subirFotoRecorrido(recorrido.id, fd)
      }

      showToast('Recorrido guardado correctamente.', 'exito')
      onGuardado()
    } catch (err) {
      const data = err?.response?.data
      let msg = 'Error al guardar el recorrido.'
      if (data) {
        if (typeof data === 'string') {
          msg = data
        } else if (data.detail) {
          msg = data.detail
        } else {
          const primerCampo = Object.keys(data)[0]
          const primerError = data[primerCampo]
          msg = Array.isArray(primerError) ? `${primerCampo}: ${primerError[0]}` : msg
        }
      }
      setErrorMsg(msg)
      showToast(msg, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const PASOS = ['Información', 'Corraletas', 'Fotos']

  return (
    <div className="min-h-svh bg-bg">
      {/* Header */}
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
            <h1 className="font-bold text-highlight">Nuevo Recorrido</h1>
            <p className="text-xs text-text-secondary">Paso {paso} de 3 — {PASOS[paso - 1]}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3 flex gap-1">
          {PASOS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i + 1 <= paso ? 'bg-highlight' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Contenido del paso */}
      <div className="px-4 py-6">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-error bg-card px-4 py-3 text-sm text-error">
            {errorMsg}
          </div>
        )}

        {paso === 1 && (
          <Paso1Info data={form} onChange={handleChange} currentUserId={userId} />
        )}
        {paso === 2 && (
          <Paso2Corraletas
            corraletas={corraletas}
            paradas={paradas}
            color={form.color}
            onAgregar={handleAgregarCorraleta}
            onQuitarUltima={handleQuitarUltima}
          />
        )}
        {paso === 3 && (
          <Paso3Fotos
            fotos={fotos}
            onAgregar={(f) => setFotos((prev) => [...prev, f])}
            onEliminar={(i) => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
            guardando={guardando}
            onGuardar={handleGuardar}
          />
        )}
      </div>

      {/* Navegación inferior */}
      {paso < 3 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-4">
          <div className="flex gap-3">
            {paso > 1 && (
              <button
                type="button"
                onClick={() => setPaso((p) => p - 1)}
                className="flex-1 rounded-2xl border border-border py-4 text-sm font-semibold text-text-secondary transition hover:border-accent"
              >
                ← Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => irAPaso(paso + 1)}
              className="flex-1 rounded-2xl bg-accent py-4 text-base font-bold text-highlight transition hover:opacity-90"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Espacio para el botón fijo */}
      {paso < 3 && <div className="h-24" />}
    </div>
  )
}
