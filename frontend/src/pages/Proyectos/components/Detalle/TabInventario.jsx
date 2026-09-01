import { useCallback, useEffect, useState } from 'react'

import {
  createItemProyecto,
  devolverItemAlInventario,
  getInventarioProyecto,
  getProductosInventario,
  registrarMovimientoItem,
} from '../../../../api/proyectos'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROLES_GESTIONAN = ['operaciones', 'superadmin']

function FormularioAgregarMaterial({ proyectoId, onCancelar, onAgregado }) {
  const { showToast } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [productoElegido, setProductoElegido] = useState(null)
  const [descripcionLibre, setDescripcionLibre] = useState('')
  const [unidad, setUnidad] = useState('')
  const [stockInicial, setStockInicial] = useState('')
  const [costoUnitario, setCostoUnitario] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    const timeout = setTimeout(() => {
      getProductosInventario({ q: busqueda, activo: true }).then(({ data }) => setResultados(data.slice(0, 8)))
    }, 250)
    return () => clearTimeout(timeout)
  }, [busqueda])

  const descripcionFinal = productoElegido ? productoElegido.descripcion : descripcionLibre
  const puedeGuardar = Boolean(descripcionFinal.trim() && unidad.trim())

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      await createItemProyecto(proyectoId, {
        producto_ref: productoElegido?.id ?? null,
        descripcion: descripcionFinal,
        unidad,
        stock_inicial: stockInicial || 0,
        costo_unitario: costoUnitario || null,
      })
      showToast('✅ Material agregado al proyecto', 'exito')
      onAgregado()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo agregar el material.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-bold text-text">Agregar material al proyecto</h3>

      {!productoElegido && (
        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el catálogo general…"
            className={inputClass}
          />
          {resultados.length > 0 && (
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-bg p-2">
              {resultados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProductoElegido(p)
                    setUnidad(p.unidad_medida_display || '')
                    setBusqueda('')
                    setResultados([])
                  }}
                  className="rounded-lg px-3 py-2 text-left text-sm hover:bg-card"
                >
                  <p className="font-mono text-xs text-text-secondary">{p.codigo}</p>
                  <p className="text-text">{p.descripcion}</p>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-text-secondary">o escribe una descripción libre para material nuevo:</p>
          <input
            type="text"
            value={descripcionLibre}
            onChange={(e) => setDescripcionLibre(e.target.value)}
            placeholder="Descripción del material nuevo…"
            className={inputClass}
          />
        </div>
      )}

      {productoElegido && (
        <div className="rounded-xl border-2 border-highlight bg-highlight/10 px-4 py-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs text-text-secondary">{productoElegido.codigo}</p>
              <p className="font-bold text-text">{productoElegido.descripcion}</p>
            </div>
            <button type="button" onClick={() => setProductoElegido(null)} className="text-xs font-semibold text-error hover:underline">
              Quitar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="unidad_item" className="mb-1 block text-sm font-medium text-text-secondary">
            Unidad *
          </label>
          <input id="unidad_item" type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} className={inputClass} placeholder="Ej. saco" />
        </div>
        <div>
          <label htmlFor="stock_inicial" className="mb-1 block text-sm font-medium text-text-secondary">
            Stock inicial
          </label>
          <input
            id="stock_inicial"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={stockInicial}
            onChange={(e) => setStockInicial(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="costo_unitario" className="mb-1 block text-sm font-medium text-text-secondary">
          Costo unitario (opcional)
        </label>
        <input
          id="costo_unitario"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={costoUnitario}
          onChange={(e) => setCostoUnitario(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancelar}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : '+ Agregar material'}
        </button>
      </div>
    </div>
  )
}

function PanelAccionItem({ item, accion, proyectoId, onCancelar, onListo }) {
  const { showToast } = useToast()
  const [tipo, setTipo] = useState('salida')
  const [cantidad, setCantidad] = useState('')
  const [descripcionUso, setDescripcionUso] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const confirm = useConfirm()

  const handleMovimiento = async () => {
    setGuardando(true)
    try {
      await registrarMovimientoItem(proyectoId, item.id, { tipo, cantidad, descripcion_uso: descripcionUso })
      showToast('✅ Movimiento registrado', 'exito')
      onListo()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar el movimiento.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleDevolver = async () => {
    const confirmado = await confirm({
      titulo: '¿Devolver material al inventario general?',
      mensaje: `${cantidad || 0} ${item.unidad} de "${item.descripcion}" regresará al inventario general.`,
      confirmText: 'Sí, devolver',
      cancelText: 'Cancelar',
      variante: 'pregunta',
    })
    if (!confirmado) return
    setGuardando(true)
    try {
      await devolverItemAlInventario(proyectoId, item.id, { cantidad, notas })
      showToast('✅ Material devuelto al inventario general', 'exito')
      onListo()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar la devolución.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mt-2 rounded-xl border-2 border-highlight bg-highlight/10 p-4">
      {accion === 'movimiento' && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {['salida', 'entrada'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              style={{ minHeight: '44px' }}
              className={`rounded-lg border text-sm font-semibold capitalize transition ${
                tipo === t ? 'border-highlight bg-highlight/20 text-highlight' : 'border-border text-text-secondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder={`Cantidad (${item.unidad})`}
        className={inputClass}
      />
      {accion === 'movimiento' ? (
        <input
          type="text"
          value={descripcionUso}
          onChange={(e) => setDescripcionUso(e.target.value)}
          placeholder="¿Para qué se usó? (opcional)"
          className={`${inputClass} mt-2`}
        />
      ) : (
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas (opcional)"
          className={`${inputClass} mt-2`}
        />
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancelar}
          style={{ minHeight: '44px' }}
          className="flex-1 rounded-xl border border-border text-sm text-text-secondary hover:border-text-secondary hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={accion === 'movimiento' ? handleMovimiento : handleDevolver}
          disabled={!(Number(cantidad) > 0) || guardando}
          style={{ minHeight: '44px' }}
          className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : accion === 'movimiento' ? 'Registrar' : '↩️ Devolver'}
        </button>
      </div>
    </div>
  )
}

export default function TabInventario({ proyecto }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarAgregar, setMostrarAgregar] = useState(false)
  const [itemActivo, setItemActivo] = useState(null)
  const [accionActiva, setAccionActiva] = useState(null)

  const puedeGestionar = ROLES_GESTIONAN.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getInventarioProyecto(proyecto.id)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { cargar() }, [cargar])

  const cerrarPanel = () => {
    setItemActivo(null)
    setAccionActiva(null)
  }

  if (mostrarAgregar) {
    return (
      <FormularioAgregarMaterial
        proyectoId={proyecto.id}
        onCancelar={() => setMostrarAgregar(false)}
        onAgregado={() => { setMostrarAgregar(false); cargar() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {puedeGestionar && (
        <button
          type="button"
          onClick={() => setMostrarAgregar(true)}
          style={{ minHeight: '48px' }}
          className="w-full rounded-xl border border-accent text-sm font-bold text-highlight transition hover:bg-accent"
        >
          + Agregar material
        </button>
      )}

      {loading && <p className="text-center text-sm text-text-secondary">Cargando inventario del proyecto…</p>}

      {!loading && items.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">📦</span>
          <p className="text-text-secondary">Sin materiales agregados a este proyecto todavía.</p>
        </div>
      )}

      {items.map((item) => {
        const sinStock = Number(item.stock_actual) <= 0
        const activo = itemActivo === item.id
        return (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-text-secondary">{item.codigo_proyecto}</p>
                <p className="font-bold text-text">{item.descripcion}</p>
              </div>
              {sinStock && (
                <span className="shrink-0 rounded-full border border-error bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
                  Sin stock
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-text-secondary">
              {item.stock_actual} {item.unidad} <span className="text-text-secondary/70">(inicial: {item.stock_inicial})</span>
            </p>

            {puedeGestionar && !activo && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setItemActivo(item.id); setAccionActiva('movimiento') }}
                  style={{ minHeight: '44px' }}
                  className="flex-1 rounded-xl border border-accent text-sm font-bold text-highlight transition hover:bg-accent"
                >
                  ↕️ Entrada/salida
                </button>
                <button
                  type="button"
                  onClick={() => { setItemActivo(item.id); setAccionActiva('devolver') }}
                  disabled={sinStock}
                  style={{ minHeight: '44px' }}
                  className="flex-1 rounded-xl border border-border text-sm font-bold text-text-secondary transition hover:border-text-secondary hover:text-text disabled:opacity-40"
                >
                  ↩️ Devolver
                </button>
              </div>
            )}

            {activo && (
              <PanelAccionItem
                item={item}
                accion={accionActiva}
                proyectoId={proyecto.id}
                onCancelar={cerrarPanel}
                onListo={() => { cerrarPanel(); cargar() }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
