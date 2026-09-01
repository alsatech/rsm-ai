import { useEffect, useState } from 'react'

import { createContratista, getContratistas } from '../../../../api/proyectos'
import { useToast } from '../../../../hooks/useToast'
import { ESPECIALIDADES_SUGERIDAS } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function SelectorContratista({ value, onChange, label = 'Contratista / proveedor' }) {
  const { showToast } = useToast()
  const [contratistas, setContratistas] = useState([])
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    getContratistas({ activo: true }).then(({ data }) => setContratistas(data)).catch(() => setContratistas([]))
  }

  useEffect(() => { cargar() }, [])

  const darDeAlta = async () => {
    if (!nuevoNombre.trim() || !nuevaEspecialidad.trim()) return
    setGuardando(true)
    try {
      const { data } = await createContratista({
        nombre: nuevoNombre, especialidad: nuevaEspecialidad, telefono: nuevoTelefono,
      })
      showToast(`✅ Contratista ${data.nombre} dado de alta`, 'exito')
      setContratistas((prev) => [...prev, data])
      onChange(String(data.id))
      setMostrarAlta(false)
      setNuevoNombre('')
      setNuevaEspecialidad('')
      setNuevoTelefono('')
    } catch {
      showToast('No se pudo dar de alta el contratista.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (mostrarAlta) {
    return (
      <div className="rounded-xl border-2 border-highlight bg-highlight/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-text">Dar de alta nuevo contratista</p>
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
            placeholder="Especialidad *"
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
            disabled={!nuevoNombre.trim() || !nuevaEspecialidad.trim() || guardando}
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
      <label htmlFor="selector-contratista" className="mb-1 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <select
        id="selector-contratista"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Selecciona…</option>
        {contratistas.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre} — {c.especialidad}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setMostrarAlta(true)}
        className="mt-2 text-xs font-semibold text-highlight hover:underline"
      >
        + No está en el catálogo, dar de alta
      </button>
    </div>
  )
}
