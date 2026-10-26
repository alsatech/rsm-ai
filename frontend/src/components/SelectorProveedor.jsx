import { useEffect, useState } from 'react'

import { createProveedor, getProveedores } from '../api/proveedores'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { ESPECIALIDADES_SUGERIDAS } from '../pages/Proveedores/constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

// Debe espejear ROLES_CRUD_PROVEEDORES en backend/apps/proveedores/permissions.py — si no
// coincide, el botón de alta rápida se muestra pero el POST truena con 403.
const ROLES_DAN_ALTA = ['operaciones', 'administrador', 'superadmin']

export default function SelectorProveedor({ value, onChange, label = 'Proveedor / contratista', tipoAlta = 'contratista' }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const puedeDarAlta = ROLES_DAN_ALTA.includes(user?.rol)
  const [proveedores, setProveedores] = useState([])
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    getProveedores({ activo: true }).then(({ data }) => setProveedores(data)).catch(() => setProveedores([]))
  }

  useEffect(() => { cargar() }, [])

  const darDeAlta = async () => {
    if (!nuevoNombre.trim()) return
    setGuardando(true)
    try {
      const { data } = await createProveedor({
        nombre: nuevoNombre, especialidad: nuevaEspecialidad, telefono: nuevoTelefono, tipo: tipoAlta,
      })
      showToast(`✅ ${data.nombre} dado de alta`, 'exito')
      setProveedores((prev) => [...prev, data])
      onChange(String(data.id))
      setMostrarAlta(false)
      setNuevoNombre('')
      setNuevaEspecialidad('')
      setNuevoTelefono('')
    } catch {
      showToast('No se pudo dar de alta el proveedor.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (mostrarAlta && puedeDarAlta) {
    return (
      <div className="rounded-xl border-2 border-highlight bg-highlight/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-text">Dar de alta nuevo proveedor</p>
          <button type="button" onClick={() => setMostrarAlta(false)} className="text-xs font-semibold text-highlight hover:underline">
            Cancelar
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre *"
            className={inputClass}
          />
          <input
            type="text"
            list="especialidades-sugeridas"
            value={nuevaEspecialidad}
            onChange={(e) => setNuevaEspecialidad(e.target.value)}
            placeholder="Especialidad (opcional)"
            className={inputClass}
          />
          <datalist id="especialidades-sugeridas">
            {ESPECIALIDADES_SUGERIDAS.map((e) => <option key={e} value={e} />)}
          </datalist>
          <input
            type="tel"
            value={nuevoTelefono}
            onChange={(e) => setNuevoTelefono(e.target.value)}
            placeholder="Teléfono (opcional)"
            className={inputClass}
          />
          <button
            type="button"
            onClick={darDeAlta}
            disabled={!nuevoNombre.trim() || guardando}
            style={{ minHeight: '48px' }}
            className="mt-1 w-full rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : '+ Dar de alta y usar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="selector-proveedor" className="mb-1 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <select
        id="selector-proveedor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Selecciona…</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}{p.especialidad ? ` — ${p.especialidad}` : ''}</option>
        ))}
      </select>
      {puedeDarAlta && (
        <button
          type="button"
          onClick={() => setMostrarAlta(true)}
          className="mt-2 text-xs font-semibold text-highlight hover:underline"
        >
          + No está en el catálogo, dar de alta
        </button>
      )}
    </div>
  )
}
