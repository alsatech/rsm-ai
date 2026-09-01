import { useCallback, useEffect, useState } from 'react'

import { getContratistas } from '../../../../api/proyectos'
import { useAuth } from '../../../../hooks/useAuth'
import FormularioContratista from './FormularioContratista'

const ROLES_CRUD = ['operaciones', 'administrador', 'superadmin']

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function ListaContratistas({ onVolver }) {
  const { user } = useAuth()
  const [contratistas, setContratistas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState('lista') // lista | nuevo | editar
  const [contratistaActivo, setContratistaActivo] = useState(null)

  const puedeCrud = ROLES_CRUD.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getContratistas(busqueda ? { q: busqueda } : {})
      setContratistas(data)
    } finally {
      setLoading(false)
    }
  }, [busqueda])

  useEffect(() => {
    const timeout = setTimeout(cargar, 250)
    return () => clearTimeout(timeout)
  }, [cargar])

  if (vista === 'nuevo' || vista === 'editar') {
    return (
      <FormularioContratista
        contratista={vista === 'editar' ? contratistaActivo : null}
        onCancelar={() => setVista('lista')}
        onGuardado={() => { setVista('lista'); setContratistaActivo(null); cargar() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o especialidad…"
          className={inputClass}
        />
        {puedeCrud && (
          <button
            type="button"
            onClick={() => setVista('nuevo')}
            style={{ minHeight: '48px' }}
            className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
          >
            + Nuevo
          </button>
        )}
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando contratistas…</p>}

      {!loading && contratistas.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">👷</span>
          <p className="text-text-secondary">Sin contratistas registrados todavía.</p>
        </div>
      )}

      {contratistas.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => {
            if (!puedeCrud) return
            setContratistaActivo(c)
            setVista('editar')
          }}
          className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent"
        >
          <div className="min-w-0">
            <p className="font-bold text-text">{c.nombre}</p>
            {c.empresa && <p className="text-xs text-text-secondary">{c.empresa}</p>}
            <p className="mt-1 text-sm text-text-secondary">{c.especialidad}</p>
            {c.telefono && <p className="mt-1 text-xs text-text-secondary">📞 {c.telefono}</p>}
          </div>
          {!c.activo && (
            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-text-secondary">
              Inactivo
            </span>
          )}
        </button>
      ))}

      <button
        type="button"
        onClick={onVolver}
        className="py-1 text-center text-sm text-text-secondary hover:text-text"
      >
        ← Volver a proyectos
      </button>
    </div>
  )
}
