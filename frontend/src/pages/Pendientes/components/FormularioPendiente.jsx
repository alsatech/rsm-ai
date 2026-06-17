import { useEffect, useState } from 'react'

import { getUsuarios } from '../../../api/pendientes'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROL_LABEL = {
  campo: 'Campo',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  administrador: 'Administrador',
  superadmin: 'Superadmin',
}

const PASOS = [
  { num: 1, titulo: 'Información básica', dot: 'bg-error' },
  { num: 2, titulo: 'Asignación y origen', dot: 'bg-warning' },
  { num: 3, titulo: 'Módulo y plazo', dot: 'bg-highlight' },
]

const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: 'border-border text-text-secondary', activeColor: 'border-border bg-border/40 text-text' },
  { value: 'media', label: 'Media', color: 'border-border text-text-secondary', activeColor: 'border-warning bg-warning/10 text-warning' },
  { value: 'alta', label: 'Alta', color: 'border-border text-text-secondary', activeColor: 'border-error bg-error/10 text-error' },
  { value: 'urgente', label: 'Urgente', color: 'border-border text-text-secondary', activeColor: 'border-error bg-error text-bg' },
]

const ORIGENES = [
  { value: 'junta', label: '📋 Junta' },
  { value: 'campo', label: '🌿 Campo' },
  { value: 'administracion', label: '🏢 Administración' },
  { value: 'sistema', label: '⚙️ Sistema' },
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

function Seccion({ titulo, children }) {
  return (
    <div className="rounded-xl border border-border/60 bg-[#0d1a11] p-4">
      {titulo && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {titulo}
        </p>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-text-secondary">
      {children}
    </label>
  )
}

export default function FormularioPendiente({ onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [asignadoA, setAsignadoA] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [errorUsuarios, setErrorUsuarios] = useState(false)
  const [paso, setPaso] = useState(1)

  const cargarUsuarios = () => {
    setCargandoUsuarios(true)
    setErrorUsuarios(false)
    getUsuarios()
      .then(({ data }) => setUsuarios(data))
      .catch(() => setErrorUsuarios(true))
      .finally(() => setCargandoUsuarios(false))
  }

  useEffect(() => { cargarUsuarios() }, [])

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const toggleUsuario = (id) => {
    setAsignadoA((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  const puedeAvanzar1 = Boolean(form.titulo.trim() && form.descripcion.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeAvanzar1) return
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
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-text">Nuevo pendiente</h2>

        {/* Progress steps */}
        <div className="mt-4 flex items-center gap-0">
          {PASOS.map((p, i) => (
            <div key={p.num} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-bg transition-colors ${
                    paso > p.num ? 'bg-highlight' : paso === p.num ? p.dot : 'bg-border/60 text-text-secondary'
                  }`}
                >
                  {paso > p.num ? '✓' : p.num}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    paso === p.num ? 'font-semibold text-text' : 'text-text-secondary'
                  }`}
                >
                  {p.titulo}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div className={`mx-3 h-px w-6 flex-shrink-0 ${paso > p.num ? 'bg-highlight' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── Paso 1 ── */}
        {paso === 1 && (
          <>
            <Seccion titulo="Datos del pendiente">
              <div>
                <Label htmlFor="titulo">Título *</Label>
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
                <Label htmlFor="descripcion">Descripción *</Label>
                <textarea
                  id="descripcion"
                  value={form.descripcion}
                  onChange={handleChange('descripcion')}
                  rows={4}
                  required
                  className={inputClass}
                  placeholder="Contexto y qué se necesita resolver"
                />
              </div>
            </Seccion>

            <Seccion titulo="Prioridad">
              <div className="grid grid-cols-4 gap-2">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, prioridad: p.value }))}
                    style={{ minHeight: '52px' }}
                    className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                      form.prioridad === p.value ? p.activeColor : p.color + ' hover:border-text-secondary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Seccion>
          </>
        )}

        {/* ── Paso 2 ── */}
        {paso === 2 && (
          <>
            <Seccion titulo="Responsables">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  Selecciona quién(es) atenderán este pendiente
                </span>
                {asignadoA.length > 0 && (
                  <span className="rounded-full bg-highlight/20 px-2 py-0.5 text-xs font-bold text-highlight">
                    {asignadoA.length} seleccionado{asignadoA.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {cargandoUsuarios && (
                <p className="py-2 text-sm text-text-secondary">Cargando usuarios…</p>
              )}

              {errorUsuarios && (
                <div className="flex items-center justify-between rounded-lg border border-error/30 bg-error/10 px-3 py-3">
                  <p className="text-sm text-error">No se pudieron cargar los usuarios.</p>
                  <button
                    type="button"
                    onClick={cargarUsuarios}
                    className="ml-3 text-sm font-medium text-highlight hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!cargandoUsuarios && !errorUsuarios && (
                <div className="flex flex-col gap-2">
                  {usuarios.map((u) => {
                    const sel = asignadoA.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUsuario(u.id)}
                        style={{ minHeight: '56px' }}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          sel
                            ? 'border-highlight bg-highlight/10 text-text'
                            : 'border-border bg-bg text-text-secondary hover:border-text-secondary hover:text-text'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                            sel ? 'border-highlight bg-highlight text-bg' : 'border-border'
                          }`}
                        >
                          {sel ? '✓' : ''}
                        </span>
                        <span className="flex-1 text-base font-medium">{u.nombre}</span>
                        <span className="rounded bg-border/40 px-1.5 py-0.5 text-xs text-text-secondary">
                          {ROL_LABEL[u.rol] ?? u.rol}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </Seccion>

            <Seccion titulo="Origen del pendiente">
              <div className="grid grid-cols-2 gap-2">
                {ORIGENES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, origen: o.value }))}
                    style={{ minHeight: '52px' }}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      form.origen === o.value
                        ? 'border-highlight bg-highlight/10 text-text'
                        : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Seccion>
          </>
        )}

        {/* ── Paso 3 ── */}
        {paso === 3 && (
          <>
            <Seccion titulo="Módulo relacionado">
              <div>
                <Label htmlFor="modulo_relacionado">¿A qué área pertenece?</Label>
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
                  <Label htmlFor="registro_relacionado_id">ID del registro (opcional)</Label>
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
            </Seccion>

            <Seccion titulo="Fecha límite">
              <div>
                <Label htmlFor="fecha_limite">¿Cuándo debe resolverse? (opcional)</Label>
                <input
                  id="fecha_limite"
                  type="date"
                  value={form.fecha_limite}
                  onChange={handleChange('fecha_limite')}
                  className={inputClass}
                />
              </div>
            </Seccion>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-1">
          {paso > 1 && (
            <button
              type="button"
              onClick={() => setPaso((p) => p - 1)}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl border border-border py-4 text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
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
              className="flex-1 rounded-xl bg-accent py-4 text-base font-bold text-text transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="submit"
              disabled={!puedeAvanzar1 || guardando}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl bg-accent py-4 text-base font-bold text-text transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar pendiente'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onCancelar}
          className="py-1 text-center text-sm text-text-secondary hover:text-text"
        >
          Cancelar
        </button>
      </form>
    </div>
  )
}
