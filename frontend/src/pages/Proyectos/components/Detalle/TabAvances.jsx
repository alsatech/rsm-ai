import { useCallback, useEffect, useRef, useState } from 'react'

import { createAvanceProyecto, getAvancesProyecto } from '../../../../api/proyectos'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/useToast'
import { formatFecha } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const MAX_FOTOS = 6
const ROLES_REGISTRAN = ['operaciones', 'campo', 'superadmin']

function FormularioAvance({ proyectoId, onCancelar, onCreado }) {
  const { showToast } = useToast()
  const [paso, setPaso] = useState(1)
  const [porcentaje, setPorcentaje] = useState(0)
  const [descripcion, setDescripcion] = useState('')
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  const puedeAvanzar1 = descripcion.trim().length > 0
  const puedeGuardar = fotos.length >= 1

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setFotos((prev) => [...prev, ...files].slice(0, MAX_FOTOS))
    e.target.value = ''
  }

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('porcentaje', porcentaje)
      fd.append('descripcion', descripcion)
      fotos.forEach((foto) => fd.append('fotos', foto))
      await createAvanceProyecto(proyectoId, fd)
      showToast('✅ Avance registrado', 'exito')
      onCreado()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar el avance.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-bold text-text">Registrar avance — paso {paso} de 2</h3>

      {paso === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="porcentaje_avance" className="text-sm font-medium text-text-secondary">
                Porcentaje completado
              </label>
              <span className="text-2xl font-bold text-highlight">{porcentaje}%</span>
            </div>
            <input
              id="porcentaje_avance"
              type="range"
              min="0"
              max="100"
              step="5"
              value={porcentaje}
              onChange={(e) => setPorcentaje(Number(e.target.value))}
              className="w-full accent-highlight"
              style={{ height: '36px' }}
            />
          </div>
          <div>
            <label htmlFor="descripcion_avance" className="mb-1 block text-sm font-medium text-text-secondary">
              Descripción del avance *
            </label>
            <textarea
              id="descripcion_avance"
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputClass}
              placeholder="¿Qué se hizo hoy?"
            />
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-text-secondary">
            Fotos de evidencia * ({fotos.length}/{MAX_FOTOS})
          </p>
          {fotos.length < MAX_FOTOS && (
            <>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFile} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-4 text-sm font-semibold text-highlight transition hover:bg-bg"
              >
                📷 Tomar foto
              </button>
            </>
          )}
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {fotos.map((foto, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={URL.createObjectURL(foto)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {paso === 1 ? (
          <button
            type="button"
            onClick={onCancelar}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPaso(1)}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            ← Anterior
          </button>
        )}
        {paso === 1 ? (
          <button
            type="button"
            onClick={() => setPaso(2)}
            disabled={!puedeAvanzar1}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!puedeGuardar || guardando}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : '✅ Registrar avance'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function TabAvances({ proyecto, onAvanceRegistrado }) {
  const { user } = useAuth()
  const [avances, setAvances] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  const puedeRegistrar = ROLES_REGISTRAN.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getAvancesProyecto(proyecto.id)
      setAvances(data)
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { cargar() }, [cargar])

  const maxPorcentaje = avances.reduce((max, a) => Math.max(max, a.porcentaje), 0)

  if (mostrarForm) {
    return (
      <FormularioAvance
        proyectoId={proyecto.id}
        onCancelar={() => setMostrarForm(false)}
        onCreado={() => {
          setMostrarForm(false)
          cargar()
          onAvanceRegistrado?.()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {puedeRegistrar && (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          style={{ minHeight: '52px' }}
          className="w-full rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90"
        >
          + Registrar avance
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
          <span>Avance acumulado</span>
          <span className="font-bold text-highlight">{maxPorcentaje}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
          <div className="h-full rounded-full bg-highlight transition-all" style={{ width: `${maxPorcentaje}%` }} />
        </div>
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando avances…</p>}

      {!loading && avances.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🔨</span>
          <p className="text-text-secondary">Sin avances registrados todavía.</p>
        </div>
      )}

      {avances.length > 0 && (
        <div className="flex flex-col gap-4">
          {avances.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-text-secondary">{formatFecha(a.fecha_avance)}</p>
                  <p className="text-sm text-text-secondary">{a.registrado_por_detalle?.nombre}</p>
                </div>
                <span className="shrink-0 rounded-full border border-highlight bg-highlight/10 px-3 py-1 text-sm font-bold text-highlight">
                  {a.porcentaje}%
                </span>
              </div>
              <p className="mt-2 text-sm text-text">{a.descripcion}</p>
              {a.fotos?.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {a.fotos.map((f) => (
                    <img key={f.id} src={f.foto} alt="Evidencia de avance" className="aspect-square rounded-lg border border-border object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
