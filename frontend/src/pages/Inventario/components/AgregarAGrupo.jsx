import { useEffect, useState } from 'react'

import { getProductos, updateGrupoMaterial } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

// Agrega materiales a un grupo que ya existe, sin pasar por la edición completa. Solo ofrece
// materiales de la MISMA ubicación del grupo y que todavía no estén en ningún grupo (así uno
// de Hangar nunca aparece en un grupo de Alacena, ni se "roba" un material de otro grupo).
// Se guarda con el mismo PATCH que la edición: el id del grupo — y su QR — no cambian.
export default function AgregarAGrupo({ grupo, onGuardado, onCerrar }) {
  const { showToast } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [disponibles, setDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [elegidos, setElegidos] = useState(() => new Set())
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setCargando(true)
    const timeout = setTimeout(() => {
      const params = { activo: true, ubicacion: grupo.ubicacion, sin_grupo: true }
      if (busqueda.trim()) params.q = busqueda.trim()
      getProductos(params)
        .then(({ data }) => setDisponibles(data))
        .catch(() => setDisponibles([]))
        .finally(() => setCargando(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [busqueda, grupo.ubicacion])

  const alternar = (id) =>
    setElegidos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })

  const handleGuardar = async () => {
    if (elegidos.size === 0) return
    setGuardando(true)
    try {
      const idsActuales = (grupo.productos ?? []).map((p) => p.id)
      const { data } = await updateGrupoMaterial(grupo.id, { producto_ids: [...idsActuales, ...elegidos] })
      showToast(`✅ ${elegidos.size} material${elegidos.size !== 1 ? 'es' : ''} agregado${elegidos.size !== 1 ? 's' : ''} al grupo`, 'exito')
      onGuardado(data)
    } catch (err) {
      showToast(err?.response?.data?.producto_ids?.[0] || 'No se pudieron agregar los materiales.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg animate-[scaleIn_0.15s_ease-out] flex-col rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-1 text-xl font-bold text-text">Agregar a "{grupo.nombre}"</h2>
        <p className="mb-4 text-xs text-text-secondary">
          Solo aparecen materiales de {grupo.ubicacion_detalle?.nombre_display ?? 'esta ubicación'} que aún no están en un grupo.
        </p>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o descripción…"
          className={`${inputClass} mb-3`}
          autoComplete="off"
        />

        <div className="min-h-[8rem] flex-1 overflow-y-auto rounded-xl border border-border">
          {cargando && <p className="p-4 text-center text-sm text-text-secondary">Buscando…</p>}
          {!cargando && disponibles.length === 0 && (
            <p className="p-4 text-center text-sm text-text-secondary">No hay materiales disponibles para agregar.</p>
          )}
          {!cargando &&
            disponibles.map((producto) => (
              <label
                key={producto.id}
                className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-bg"
              >
                <input
                  type="checkbox"
                  checked={elegidos.has(producto.id)}
                  onChange={() => alternar(producto.id)}
                  className="h-5 w-5 shrink-0 accent-[#4ade80]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{producto.descripcion}</p>
                  <p className="text-xs text-text-secondary">
                    {producto.codigo} · {Number(producto.stock_actual).toLocaleString('es-MX')} {UNIDAD_LABELS[producto.unidad_medida]}
                  </p>
                </div>
              </label>
            ))}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCerrar}
            style={{ minHeight: '52px' }}
            className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || elegidos.size === 0}
            style={{ minHeight: '52px' }}
            className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : `Agregar${elegidos.size ? ` (${elegidos.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
