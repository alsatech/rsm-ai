import { useEffect, useState } from 'react'

import { getProductos } from '../../../../api/inventario'
import { useConfirm } from '../../../../hooks/useConfirm'
import { AREA_LABELS, UNIDAD_LABELS } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const PASOS = [
  { num: 1, titulo: 'Información general' },
  { num: 2, titulo: 'Materiales' },
  { num: 3, titulo: 'Confirmar' },
]

const ITEM_VACIO = {
  producto: null,
  productoDetalle: null,
  descripcion_libre: '',
  cantidad_solicitada: '',
  unidad: '',
  notas: '',
  es_producto_nuevo: false,
}

function Seccion({ titulo, children }) {
  return (
    <div className="rounded-xl border border-border/60 bg-[#0d1a11] p-4">
      {titulo && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">{titulo}</p>
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

function BuscadorProducto({ onElegir }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [productoNuevo, setProductoNuevo] = useState(false)

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    setBuscando(true)
    const timeout = setTimeout(() => {
      getProductos({ q: busqueda, activo: true })
        .then(({ data }) => setResultados(data.slice(0, 8)))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [busqueda])

  if (productoNuevo) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Producto nuevo (no está en el catálogo)</p>
          <button
            type="button"
            onClick={() => setProductoNuevo(false)}
            className="text-xs font-semibold text-highlight hover:underline"
          >
            Buscar en catálogo
          </button>
        </div>
        <input
          type="text"
          placeholder="Describe el producto nuevo…"
          className={inputClass}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              onElegir({ producto: null, productoDetalle: null, descripcion_libre: e.target.value.trim(), es_producto_nuevo: true })
              e.target.value = ''
            }
          }}
        />
        <p className="text-xs text-text-secondary">Escribe la descripción y toca fuera del campo para agregarlo.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar producto por código o descripción…"
        className={inputClass}
      />
      {buscando && <p className="text-xs text-text-secondary">Buscando…</p>}
      {resultados.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
          {resultados.map((producto) => (
            <button
              key={producto.id}
              type="button"
              onClick={() => {
                onElegir({ producto: producto.id, productoDetalle: producto, descripcion_libre: '', es_producto_nuevo: false })
                setBusqueda('')
                setResultados([])
              }}
              className="rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-bg"
            >
              <p className="font-mono text-xs text-text-secondary">{producto.codigo}</p>
              <p className="font-semibold text-text">{producto.descripcion}</p>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setProductoNuevo(true)}
        className="self-start text-xs font-semibold text-highlight hover:underline"
      >
        + No está en el catálogo, agregar producto nuevo
      </button>
    </div>
  )
}

function itemDesdePrefill(producto) {
  if (!producto) return null
  return {
    producto: producto.id,
    productoDetalle: producto,
    descripcion_libre: '',
    cantidad_solicitada: producto.stock_minimo || 1,
    unidad: producto.unidad_medida_display || '',
    notas: '',
    es_producto_nuevo: false,
  }
}

export default function FormularioSolicitud({ onGuardar, onCancelar, guardando, prefill }) {
  const confirm = useConfirm()
  const [paso, setPaso] = useState(1)
  const [area, setArea] = useState('campo')
  const [descripcionNecesidad, setDescripcionNecesidad] = useState(
    prefill ? `Reponer stock bajo de ${prefill.descripcion}` : ''
  )
  const [fechaRequerida, setFechaRequerida] = useState('')
  const [items, setItems] = useState(() => {
    const item = itemDesdePrefill(prefill)
    return item ? [item] : []
  })
  const [itemActual, setItemActual] = useState(ITEM_VACIO)

  const puedeAvanzar1 = Boolean(descripcionNecesidad.trim())
  const puedeAvanzar2 = items.length > 0

  const agregarProductoAlItem = (datos) => {
    setItemActual((prev) => ({ ...prev, ...datos }))
  }

  const agregarItem = () => {
    if (!itemActual.producto && !itemActual.descripcion_libre) return
    if (!itemActual.cantidad_solicitada || Number(itemActual.cantidad_solicitada) <= 0) return
    setItems((prev) => [...prev, itemActual])
    setItemActual(ITEM_VACIO)
  }

  const quitarItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index))

  const guardar = async (estado) => {
    const confirmado = await confirm({
      titulo: estado === 'borrador' ? '¿Guardar como borrador?' : '¿Enviar para autorización?',
      mensaje:
        estado === 'borrador'
          ? 'Podrás editarla y enviarla más tarde.'
          : `Se enviará con ${items.length} material${items.length !== 1 ? 'es' : ''} para que la autorice un administrador.`,
      confirmText: 'Sí, continuar',
      cancelText: 'Revisar',
      variante: 'pregunta',
    })
    if (!confirmado) return

    const payload = {
      area,
      descripcion_necesidad: descripcionNecesidad,
      fecha_requerida: fechaRequerida || null,
      estado,
      items: items.map((item) => ({
        producto: item.producto,
        descripcion_libre: item.descripcion_libre,
        cantidad_solicitada: item.cantidad_solicitada,
        unidad: item.unidad,
        notas: item.notas,
        es_producto_nuevo: item.es_producto_nuevo,
      })),
    }
    await onGuardar(payload)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-text">Nueva solicitud de material</h2>
        <div className="mt-4 flex items-center gap-0">
          {PASOS.map((p, i) => (
            <div key={p.num} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-bg transition-colors ${
                    paso > p.num ? 'bg-highlight' : paso === p.num ? 'bg-highlight' : 'bg-border/60 text-text-secondary'
                  }`}
                >
                  {paso > p.num ? '✓' : p.num}
                </div>
                <span className={`text-sm ${paso === p.num ? 'font-semibold text-text' : 'text-text-secondary'}`}>
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

      {paso === 1 && (
        <div className="flex flex-col gap-4">
          <Seccion titulo="¿Qué área solicita?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(AREA_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setArea(value)}
                  style={{ minHeight: '52px' }}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                    area === value
                      ? 'border-highlight bg-highlight/10 text-highlight'
                      : 'border-border text-text-secondary hover:border-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="¿Para qué se necesita?">
            <div>
              <Label htmlFor="descripcion_necesidad">Descripción de la necesidad *</Label>
              <textarea
                id="descripcion_necesidad"
                rows={4}
                value={descripcionNecesidad}
                onChange={(e) => setDescripcionNecesidad(e.target.value)}
                className={inputClass}
                placeholder="Ej. Reparación de cerca en Corraleta 4, se necesita alambre y grapas"
              />
            </div>
            <div>
              <Label htmlFor="fecha_requerida">Fecha requerida (opcional)</Label>
              <input
                id="fecha_requerida"
                type="date"
                value={fechaRequerida}
                onChange={(e) => setFechaRequerida(e.target.value)}
                className={inputClass}
              />
            </div>
          </Seccion>
        </div>
      )}

      {paso === 2 && (
        <div className="flex flex-col gap-4">
          <Seccion titulo="Agregar material">
            <BuscadorProducto onElegir={agregarProductoAlItem} />

            {(itemActual.producto || itemActual.descripcion_libre) && (
              <div className="rounded-xl border-2 border-highlight bg-highlight/10 px-4 py-3">
                <p className="font-bold text-text">
                  {itemActual.productoDetalle?.descripcion || itemActual.descripcion_libre}
                  {itemActual.es_producto_nuevo && <span className="ml-2 text-xs text-warning">(nuevo)</span>}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cantidad_solicitada">Cantidad *</Label>
                    <input
                      id="cantidad_solicitada"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={itemActual.cantidad_solicitada}
                      onChange={(e) => setItemActual((prev) => ({ ...prev, cantidad_solicitada: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unidad">Unidad</Label>
                    <input
                      id="unidad"
                      type="text"
                      list="unidades-sugeridas"
                      value={itemActual.unidad}
                      onChange={(e) => setItemActual((prev) => ({ ...prev, unidad: e.target.value }))}
                      className={inputClass}
                      placeholder="Ej. pieza"
                    />
                    <datalist id="unidades-sugeridas">
                      {Object.values(UNIDAD_LABELS).map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="notas_item">Notas (opcional)</Label>
                  <input
                    id="notas_item"
                    type="text"
                    value={itemActual.notas}
                    onChange={(e) => setItemActual((prev) => ({ ...prev, notas: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={agregarItem}
                  disabled={!itemActual.cantidad_solicitada || Number(itemActual.cantidad_solicitada) <= 0}
                  style={{ minHeight: '48px' }}
                  className="mt-3 w-full rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
                >
                  + Agregar a la lista
                </button>
              </div>
            )}
          </Seccion>

          {items.length > 0 && (
            <Seccion titulo={`Materiales agregados (${items.length})`}>
              <div className="flex flex-col gap-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {item.productoDetalle?.descripcion || item.descripcion_libre}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {item.cantidad_solicitada} {item.unidad || ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarItem(index)}
                      className="text-sm font-semibold text-error hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </Seccion>
          )}
        </div>
      )}

      {paso === 3 && (
        <div className="flex flex-col gap-4">
          <Seccion titulo="Resumen">
            <p className="text-sm text-text-secondary">
              Área: <span className="font-semibold text-text">{AREA_LABELS[area]}</span>
            </p>
            <p className="text-sm text-text-secondary">{descripcionNecesidad}</p>
            {fechaRequerida && (
              <p className="text-sm text-text-secondary">
                Fecha requerida: <span className="text-text">{fechaRequerida}</span>
              </p>
            )}
          </Seccion>
          <Seccion titulo={`${items.length} material${items.length !== 1 ? 'es' : ''}`}>
            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-text">{item.productoDetalle?.descripcion || item.descripcion_libre}</span>
                  <span className="font-mono text-text-secondary">
                    {item.cantidad_solicitada} {item.unidad}
                  </span>
                </div>
              ))}
            </div>
          </Seccion>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {paso > 1 && (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            ← Anterior
          </button>
        )}
        {paso < 3 && (
          <button
            type="button"
            onClick={() => setPaso((p) => p + 1)}
            disabled={(paso === 1 && !puedeAvanzar1) || (paso === 2 && !puedeAvanzar2)}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        )}
        {paso === 3 && (
          <div className="flex flex-1 gap-2">
            <button
              type="button"
              onClick={() => guardar('borrador')}
              disabled={guardando}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl border border-accent text-sm font-bold text-highlight transition hover:bg-accent disabled:opacity-50"
            >
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={() => guardar('enviada')}
              disabled={guardando}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Enviando…' : 'Enviar para autorización'}
            </button>
          </div>
        )}
      </div>

      <button type="button" onClick={onCancelar} className="mt-3 w-full py-1 text-center text-sm text-text-secondary hover:text-text">
        Cancelar
      </button>
    </div>
  )
}
