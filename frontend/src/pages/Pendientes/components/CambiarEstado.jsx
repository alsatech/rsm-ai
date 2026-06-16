import { useState } from 'react'

const MOTIVOS_BLOQUEO = [
  { value: 'falta_material', label: 'Falta de material' },
  { value: 'falta_personal', label: 'Falta de personal' },
  { value: 'falta_presupuesto', label: 'Falta de presupuesto' },
  { value: 'incidente', label: 'Incidente' },
  { value: 'clima', label: 'Clima' },
  { value: 'otro', label: 'Otro' },
]

function getOpcionesEstado(estadoActual, esCampo) {
  const todas = [
    { value: 'abierto', label: 'Abierto' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'bloqueado', label: 'Bloqueado' },
    { value: 'cerrado', label: 'Cerrado' },
  ]
  const opciones = todas.filter((o) => o.value !== estadoActual)
  if (esCampo) return opciones.filter((o) => o.value !== 'cerrado')
  return opciones
}

export default function CambiarEstado({ estadoActual, esCampo, guardando, onCambiar }) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')

  const opciones = getOpcionesEstado(estadoActual, esCampo)
  const requiereMotivo = estadoSeleccionado === 'bloqueado'
  const puedeGuardar = estadoSeleccionado && (!requiereMotivo || motivo)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    await onCambiar({
      estado: estadoSeleccionado,
      motivo_bloqueo: requiereMotivo ? motivo : undefined,
      nota,
    })
    setEstadoSeleccionado('')
    setMotivo('')
    setNota('')
  }

  const COLOR_BOTON = {
    abierto: 'border-error/50 text-error',
    en_proceso: 'border-warning/50 text-warning',
    bloqueado: 'border-orange-400/50 text-orange-400',
    cerrado: 'border-highlight/50 text-highlight',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm text-text-secondary">Cambiar estado a:</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {opciones.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => {
                setEstadoSeleccionado(op.value)
                if (op.value !== 'bloqueado') setMotivo('')
              }}
              style={{ minHeight: '56px' }}
              className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                estadoSeleccionado === op.value
                  ? `${COLOR_BOTON[op.value]} bg-border/30`
                  : 'border-border text-text-secondary hover:border-highlight'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {requiereMotivo && (
        <div>
          <label className="mb-1 block text-sm text-[#86ef69]">
            Motivo del bloqueo <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS_BLOQUEO.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMotivo(m.value)}
                style={{ minHeight: '52px' }}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  motivo === m.value
                    ? 'border-orange-400 bg-orange-500/10 text-orange-300'
                    : 'border-border text-text-secondary hover:border-orange-400/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {estadoSeleccionado && (
        <div>
          <label className="mb-1 block text-sm text-[#86ef69]" htmlFor="nota-cambio">
            Nota (opcional)
          </label>
          <textarea
            id="nota-cambio"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Agrega contexto sobre el cambio"
            className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!puedeGuardar || guardando}
        style={{ minHeight: '56px' }}
        className="rounded-xl bg-accent px-4 py-4 text-base font-bold text-text transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Confirmar cambio de estado'}
      </button>
    </form>
  )
}
