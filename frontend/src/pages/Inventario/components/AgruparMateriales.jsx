import { useEffect, useState } from 'react'

import { createGrupoMaterial, getProductos, updateGrupoMaterial } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UBICACION_LABELS, UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

// grupoExistente=null -> crear grupo nuevo. grupoExistente={...} -> editar (renombrar y/o
// cambiar qué productos lo integran) sin que cambie su id ni, por lo tanto, el QR ya impreso.
//
// Mismo patrón de búsqueda que Paso1Producto.jsx (escribir -> resultados -> elegir) en vez de
// listar todo el catálogo de un jalón: con ubicaciones de 100+ productos (ej. Bodega), mostrar
// la lista completa de entrada no es usable. Aquí se busca y se va agregando uno por uno a una
// lista de seleccionados, hasta terminar y ponerle nombre.
export default function AgruparMateriales({ grupoExistente, onGuardado, onCerrar }) {
  const { showToast } = useToast()
  const esEdicion = Boolean(grupoExistente)
  const [nombre, setNombre] = useState(grupoExistente?.nombre ?? '')
  const [seleccionados, setSeleccionados] = useState(grupoExistente?.productos ?? [])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // La ubicación queda fija en cuanto se agrega el primer producto (o la del grupo que se está
  // editando) — es la regla de negocio que impide mezclar Granero con Hangar en un mismo grupo.
  // En cuanto queda fija, la búsqueda misma se restringe a esa ubicación (no solo se bloquean
  // visualmente los de otra ubicación).
  const ubicacionBloqueadaId = grupoExistente?.ubicacion ?? seleccionados[0]?.ubicacion ?? null

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    setBuscando(true)
    const timeout = setTimeout(() => {
      const params = { q: busqueda, activo: true }
      if (ubicacionBloqueadaId) params.ubicacion = ubicacionBloqueadaId
      getProductos(params)
        .then(({ data }) => {
          const yaElegidos = new Set(seleccionados.map((p) => p.id))
          setResultados(data.filter((p) => !yaElegidos.has(p.id)).slice(0, 8))
        })
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [busqueda, ubicacionBloqueadaId, seleccionados])

  const agregarProducto = (producto) => {
    setSeleccionados((prev) => [...prev, producto])
    setBusqueda('')
    setResultados([])
  }

  const quitarProducto = (id) => {
    setSeleccionados((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (seleccionados.length === 0) {
      showToast('Busca y agrega al menos un material para el grupo.', 'error')
      return
    }
    setGuardando(true)
    try {
      const payload = { nombre, producto_ids: seleccionados.map((p) => p.id) }
      const { data } = esEdicion
        ? await updateGrupoMaterial(grupoExistente.id, payload)
        : await createGrupoMaterial(payload)
      showToast(esEdicion ? '✅ Grupo actualizado' : '✅ Grupo creado', 'exito')
      onGuardado(data)
    } catch (err) {
      const mensaje =
        err?.response?.data?.producto_ids?.[0] || err?.response?.data?.nombre?.[0] || 'No se pudo guardar el grupo.'
      showToast(mensaje, 'error')
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
        className="flex w-full max-w-lg animate-[scaleIn_0.15s_ease-out] flex-col rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-1 text-xl font-bold text-text">{esEdicion ? 'Editar grupo' : 'Agrupar materiales'}</h2>
        <p className="mb-4 text-xs text-text-secondary">
          {ubicacionBloqueadaId
            ? 'Solo se buscan materiales de la misma ubicación que el primero que agregaste.'
            : 'Busca y agrega los materiales — todos deben ser de la misma ubicación.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="relative">
            <label className={labelClass} htmlFor="busqueda-grupo">Buscar material</label>
            <input
              id="busqueda-grupo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={inputClass}
              placeholder="Buscar por código o descripción…"
              autoComplete="off"
            />
            {buscando && <p className="mt-1 text-xs text-text-secondary">Buscando…</p>}

            {resultados.length > 0 && (
              <div className="absolute z-10 mt-1 flex max-h-64 w-full flex-col overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl">
                {resultados.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => agregarProducto(producto)}
                    className="rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-bg"
                  >
                    <p className="font-mono text-xs text-text-secondary">{producto.codigo}</p>
                    <p className="font-semibold text-text">{producto.descripcion}</p>
                    <p className="text-xs text-text-secondary">
                      {UBICACION_LABELS[producto.ubicacion_detalle?.nombre] ?? producto.ubicacion_detalle?.nombre_display}
                      {' · '}
                      {Number(producto.stock_actual).toLocaleString('es-MX')} {UNIDAD_LABELS[producto.unidad_medida]}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {!buscando && busqueda.trim().length >= 2 && resultados.length === 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                Sin resultados{ubicacionBloqueadaId ? ' en esa ubicación' : ''}.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="nombre-grupo">Nombre del grupo *</label>
            <input
              id="nombre-grupo"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Ej: Tornillos y tuercas"
            />
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border border-border">
            {seleccionados.length === 0 && (
              <p className="p-4 text-center text-sm text-text-secondary">
                Aún no agregas materiales — búscalos arriba.
              </p>
            )}
            {seleccionados.map((producto) => (
              <div
                key={producto.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{producto.descripcion}</p>
                  <p className="text-xs text-text-secondary">
                    {producto.codigo} · {UBICACION_LABELS[producto.ubicacion_detalle?.nombre] ?? producto.ubicacion_detalle?.nombre_display}
                    {' · '}
                    {Number(producto.stock_actual).toLocaleString('es-MX')} {UNIDAD_LABELS[producto.unidad_medida]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitarProducto(producto.id)}
                  aria-label={`Quitar ${producto.descripcion}`}
                  className="shrink-0 text-sm font-semibold text-text-secondary hover:text-error"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
