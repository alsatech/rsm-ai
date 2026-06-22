import { useRef, useState } from 'react'

import { subirFoto } from '../../../api/pendientes'

const MOTIVOS_BLOQUEO = [
  { value: 'falta_material', label: 'Falta de material' },
  { value: 'falta_personal', label: 'Falta de personal' },
  { value: 'falta_presupuesto', label: 'Falta de presupuesto' },
  { value: 'incidente', label: 'Incidente' },
  { value: 'clima', label: 'Clima' },
  { value: 'otro', label: 'Otro' },
]

const COLOR_BOTON = {
  abierto: 'border-error/50 text-error',
  en_proceso: 'border-warning/50 text-warning',
  bloqueado: 'border-orange-400/50 text-orange-400',
  cerrado: 'border-highlight/50 text-highlight',
}

function getOpciones(estadoActual, esCampo) {
  const todas = [
    { value: 'abierto', label: 'Abierto' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'bloqueado', label: 'Bloqueado' },
    { value: 'cerrado', label: 'Terminado' },
  ]
  return todas
    .filter((o) => o.value !== estadoActual)
    .filter((o) => !esCampo || o.value !== 'cerrado')
}

function SeccionCierre({ pendienteId, solucion, setSolucion, seComproMaterial, setSeComproMaterial, quienCompro, setQuienCompro, fotoCierre, setFotoCierre, errorFoto }) {
  const fileRef = useRef(null)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-highlight/20 bg-highlight/5 p-4">
      <div className="flex items-center gap-2 border-b border-highlight/20 pb-3">
        <span className="text-xl">✅</span>
        <p className="font-semibold text-text">Información de cierre</p>
      </div>

      {/* Solución */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="solucion-cierre">
          ¿Cuál fue la solución? <span className="text-error">*</span>
        </label>
        <textarea
          id="solucion-cierre"
          value={solucion}
          onChange={(e) => setSolucion(e.target.value)}
          rows={3}
          placeholder="Describe qué se hizo para resolver el pendiente"
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
        />
        {!solucion.trim() && (
          <p className="mt-1 text-xs text-text-secondary">Campo obligatorio para cerrar</p>
        )}
      </div>

      {/* ¿Se compró material? */}
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">
          ¿Se requirió compra de material?<span className="ml-1 text-error">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setSeComproMaterial(true); }}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border px-4 py-3 text-base font-semibold transition ${
              seComproMaterial === true
                ? 'border-warning bg-warning/10 text-warning'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
            }`}
          >
            Sí, se compró
          </button>
          <button
            type="button"
            onClick={() => { setSeComproMaterial(false); setQuienCompro('') }}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border px-4 py-3 text-base font-semibold transition ${
              seComproMaterial === false
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
            }`}
          >
            No se compró
          </button>
        </div>
      </div>

      {/* ¿Quién compró? */}
      {seComproMaterial === true && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="quien-compro">
            ¿Quién realizó la compra? <span className="text-error">*</span>
          </label>
          <input
            id="quien-compro"
            type="text"
            value={quienCompro}
            onChange={(e) => setQuienCompro(e.target.value)}
            placeholder="Nombre de quien compró el material"
            className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
          />
        </div>
      )}

      {/* Foto de evidencia */}
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">
          Foto de evidencia del cierre <span className="text-error">*</span>
        </p>
        <label
          htmlFor={`foto-cierre-${pendienteId}`}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition ${
            fotoCierre
              ? 'border-highlight bg-highlight/10'
              : errorFoto
              ? 'border-error bg-error/5'
              : 'border-border hover:border-highlight/50'
          }`}
        >
          <span className="text-4xl">{fotoCierre ? '✅' : '📷'}</span>
          <span className="text-center text-base font-medium text-text">
            {fotoCierre ? fotoCierre.name : 'Tomar foto de evidencia'}
          </span>
          <span className="text-xs text-text-secondary">
            {fotoCierre ? 'Toca para cambiar' : 'Obligatorio — abre cámara o galería'}
          </span>
        </label>
        <input
          ref={fileRef}
          id={`foto-cierre-${pendienteId}`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFotoCierre(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
        {errorFoto && (
          <p className="mt-1 text-xs text-error">{errorFoto}</p>
        )}
        {!fotoCierre && !errorFoto && (
          <p className="mt-1 text-xs text-text-secondary">Obligatorio para cerrar</p>
        )}
      </div>
    </div>
  )
}

export default function CambiarEstado({ estadoActual, esCampo, guardando, pendienteId, onCambiar }) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')

  // Campos de cierre
  const [solucion, setSolucion] = useState('')
  const [seComproMaterial, setSeComproMaterial] = useState(null)
  const [quienCompro, setQuienCompro] = useState('')
  const [fotoCierre, setFotoCierre] = useState(null)
  const [errorFoto, setErrorFoto] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const opciones = getOpciones(estadoActual, esCampo)
  const esCierre = estadoSeleccionado === 'cerrado'
  const requiereMotivo = estadoSeleccionado === 'bloqueado'

  const puedeGuardar = (() => {
    if (!estadoSeleccionado) return false
    if (requiereMotivo && !motivo) return false
    if (esCierre) {
      if (!solucion.trim()) return false
      if (seComproMaterial === null) return false
      if (seComproMaterial === true && !quienCompro.trim()) return false
      if (!fotoCierre) return false
    }
    return true
  })()

  const resetForm = () => {
    setEstadoSeleccionado('')
    setMotivo('')
    setNota('')
    setSolucion('')
    setSeComproMaterial(null)
    setQuienCompro('')
    setFotoCierre(null)
    setErrorFoto('')
  }

  const handleSeleccionarEstado = (valor) => {
    setEstadoSeleccionado(valor)
    if (valor !== 'bloqueado') setMotivo('')
    if (valor !== 'cerrado') {
      setSolucion('')
      setSeComproMaterial(null)
      setQuienCompro('')
      setFotoCierre(null)
      setErrorFoto('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return

    if (esCierre && fotoCierre) {
      setSubiendoFoto(true)
      setErrorFoto('')
      try {
        const fd = new FormData()
        fd.append('foto', fotoCierre)
        fd.append('momento', 'cierre')
        fd.append('descripcion', 'Evidencia de cierre')
        await subirFoto(pendienteId, fd)
      } catch {
        setErrorFoto('No se pudo subir la foto. Intenta de nuevo antes de cerrar.')
        setSubiendoFoto(false)
        return
      }
      setSubiendoFoto(false)
    }

    await onCambiar({
      estado: estadoSeleccionado,
      motivo_bloqueo: requiereMotivo ? motivo : undefined,
      nota,
      ...(esCierre && {
        solucion_cierre: solucion,
        se_compro_material: seComproMaterial,
        quien_compro: seComproMaterial ? quienCompro : '',
      }),
    })
    resetForm()
  }

  const labelBotonSubmit = () => {
    if (subiendoFoto) return 'Subiendo foto de evidencia…'
    if (guardando) return 'Cerrando pendiente…'
    if (esCierre) return 'Confirmar cierre'
    return 'Confirmar cambio de estado'
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Opciones de estado */}
      <div>
        <p className="mb-2 text-sm text-text-secondary">Cambiar estado a:</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {opciones.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => handleSeleccionarEstado(op.value)}
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

      {/* Motivo de bloqueo */}
      {requiereMotivo && (
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Motivo del bloqueo <span className="text-error">*</span>
          </p>
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

      {/* Nota general (solo estados que no son cierre) */}
      {estadoSeleccionado && !esCierre && (
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="nota-cambio">
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

      {/* Formulario especial de cierre */}
      {esCierre && (
        <SeccionCierre
          pendienteId={pendienteId}
          solucion={solucion}
          setSolucion={setSolucion}
          seComproMaterial={seComproMaterial}
          setSeComproMaterial={setSeComproMaterial}
          quienCompro={quienCompro}
          setQuienCompro={setQuienCompro}
          fotoCierre={fotoCierre}
          setFotoCierre={setFotoCierre}
          errorFoto={errorFoto}
        />
      )}

      {/* Botón de envío */}
      {estadoSeleccionado && (
        <button
          type="submit"
          disabled={!puedeGuardar || guardando || subiendoFoto}
          style={{ minHeight: '56px' }}
          className={`rounded-xl px-4 py-4 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            esCierre
              ? 'bg-highlight text-bg hover:opacity-90'
              : 'bg-accent text-text hover:bg-highlight hover:text-bg'
          }`}
        >
          {labelBotonSubmit()}
        </button>
      )}
    </form>
  )
}
