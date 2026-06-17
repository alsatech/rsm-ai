import { useEffect, useState } from 'react'

import { getUsuarios } from '../../../api/pendientes'

const ROL_LABEL = {
  campo: 'Campo',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  administrador: 'Administrador',
  superadmin: 'Superadmin',
}

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm text-[#86ef69]'

const PRIORIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const ORIGENES = [
  { value: 'junta', label: 'Junta' },
  { value: 'campo', label: 'Campo' },
  { value: 'administracion', label: 'Administración' },
  { value: 'sistema', label: 'Sistema' },
]

const MODULOS = [
  { value: 'ninguno', label: 'Ninguno' },
  { value: 'hidraulica', label: 'Hidráulica' },
  { value: 'flota', label: 'Flota' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'personal', label: 'Personal' },
]

const ESTADO_INICIAL = {
  titulo: '',
  descripcion: '',
  prioridad: 'media',
  origen: 'junta',
  modulo_relacionado: 'ninguno',
  registro_relacionado_id: '',
  fecha_limite: '',
}

export default function FormularioPendiente({ onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [asignadoA, setAsignadoA] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [errorUsuarios, setErrorUsuarios] = useState(false)
  const [paso, setPaso] = useState(1)

  useEffect(() => {
    setCargandoUsuarios(true)
    setErrorUsuarios(false)
    getUsuarios()
      .then(({ data }) => setUsuarios(data))
      .catch(() => setErrorUsuarios(true))
      .finally(() => setCargandoUsuarios(false))
  }, [])

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const toggleUsuario = (id) => {
    setAsignadoA((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  const puedeAvanzar1 = Boolean(form.titulo.trim() && form.descripcion.trim())
  const puedeGuardar = puedeAvanzar1

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return

    const payload = {
      ...form,
      asignado_a: asignadoA,
      registro_relacionado_id: form.registro_relacionado_id || null,
      fecha_limite: form.fecha_limite || null,
    }
    await onGuardar(payload)
    setForm(ESTADO_INICIAL)
    setAsignadoA([])
    setPaso(1)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">Nuevo pendiente</h2>
        <span className="text-sm text-text-secondary">Paso {paso} de 3</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {paso === 1 && (
          <>
            <div>
              <label className={labelClass} htmlFor="titulo">
                Título <span className="text-error">*</span>
              </label>
              <input
                id="titulo"
                type="text"
                value={form.titulo}
                onChange={handleChange('titulo')}
                required
                className={inputClass}
                placeholder="Describe brevemente el pendiente"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="descripcion">
                Descripción <span className="text-error">*</span>
              </label>
              <textarea
                id="descripcion"
                value={form.descripcion}
                onChange={handleChange('descripcion')}
                rows={4}
                required
                className={inputClass}
                placeholder="Detalla el pendiente, contexto y qué se necesita resolver"
              />
            </div>

            <div>
              <p className={labelClass}>Prioridad</p>
              <div className="grid grid-cols-4 gap-2">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, prioridad: p.value }))}
                    style={{ minHeight: '52px' }}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                      form.prioridad === p.value
                        ? 'border-highlight bg-accent text-highlight'
                        : 'border-border text-text-secondary hover:border-highlight'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className={labelClass}>Asignar a</p>
                {asignadoA.length > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-highlight">
                    {asignadoA.length} seleccionado{asignadoA.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {cargandoUsuarios && (
                <p className="text-sm text-text-secondary">Cargando usuarios…</p>
              )}
              {errorUsuarios && (
                <p className="text-sm text-error">No se pudieron cargar los usuarios.</p>
              )}
              {!cargandoUsuarios && !errorUsuarios && (
                <div className="flex flex-col gap-2">
                  {usuarios.map((u) => {
                    const seleccionado = asignadoA.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUsuario(u.id)}
                        style={{ minHeight: '56px' }}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          seleccionado
                            ? 'border-highlight bg-accent/30 text-text'
                            : 'border-border bg-bg text-text-secondary hover:border-highlight hover:text-text'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                            seleccionado
                              ? 'border-highlight bg-highlight text-bg'
                              : 'border-border'
                          }`}
                        >
                          {seleccionado ? '✓' : ''}
                        </span>
                        <span className="flex-1 text-base font-medium">{u.nombre}</span>
                        <span className="text-xs text-text-secondary">
                          {ROL_LABEL[u.rol] ?? u.rol}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <p className={labelClass}>Origen</p>
              <div className="grid grid-cols-2 gap-2">
                {ORIGENES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, origen: o.value }))}
                    style={{ minHeight: '52px' }}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      form.origen === o.value
                        ? 'border-highlight bg-accent text-highlight'
                        : 'border-border text-text-secondary hover:border-highlight'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <div>
              <label className={labelClass} htmlFor="modulo_relacionado">
                Módulo relacionado
              </label>
              <select
                id="modulo_relacionado"
                value={form.modulo_relacionado}
                onChange={handleChange('modulo_relacionado')}
                className={inputClass}
              >
                {MODULOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {form.modulo_relacionado !== 'ninguno' && (
              <div>
                <label className={labelClass} htmlFor="registro_relacionado_id">
                  ID del registro relacionado (opcional)
                </label>
                <input
                  id="registro_relacionado_id"
                  type="number"
                  inputMode="numeric"
                  value={form.registro_relacionado_id}
                  onChange={handleChange('registro_relacionado_id')}
                  className={inputClass}
                  placeholder="Ej: 42"
                />
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="fecha_limite">
                Fecha límite (opcional)
              </label>
              <input
                id="fecha_limite"
                type="date"
                value={form.fecha_limite}
                onChange={handleChange('fecha_limite')}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {paso > 1 && (
            <button
              type="button"
              onClick={() => setPaso((p) => p - 1)}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl border border-border py-4 text-base text-text-secondary hover:text-text"
            >
              ← Anterior
            </button>
          )}

          {paso < 3 ? (
            <button
              type="button"
              onClick={() => setPaso((p) => p + 1)}
              disabled={paso === 1 && !puedeAvanzar1}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl bg-accent py-4 text-base font-bold text-text transition hover:bg-highlight hover:text-bg disabled:opacity-60"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="submit"
              disabled={!puedeGuardar || guardando}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl bg-accent py-4 text-base font-bold text-text transition hover:bg-highlight hover:text-bg disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar pendiente'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onCancelar}
          className="text-center text-sm text-text-secondary hover:text-text"
        >
          Cancelar
        </button>
      </form>
    </div>
  )
}
