import { UNIDAD_LABELS, esProductoCombustible } from '../constants'

export default function Paso3Confirmar({
  form, productoSeleccionado, stockResultante, guardando, onGuardar, vehiculos = [], usuarios = [],
}) {
  const unidad = UNIDAD_LABELS[productoSeleccionado?.unidad_medida]
  const dejaEnCero = form.tipo === 'salida' && stockResultante <= 0
  const dejaEnMinimo =
    !dejaEnCero &&
    productoSeleccionado?.stock_minimo > 0 &&
    stockResultante <= Number(productoSeleccionado.stock_minimo)

  const esCombustible = esProductoCombustible(productoSeleccionado)
  const vehiculoSeleccionado = esCombustible
    ? vehiculos.find((v) => Number(v.id) === Number(form.vehiculo))
    : null

  const esCompra = form.tipo === 'entrada' && Number(form.monto_compra) > 0
  const compradorSeleccionado = esCompra
    ? usuarios.find((u) => Number(u.id) === Number(form.comprado_por))
    : null

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold text-text-secondary">Resumen del movimiento</p>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Producto</span>
            <span className="text-right font-semibold text-text">{productoSeleccionado?.descripcion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Tipo</span>
            <span className="font-semibold text-text">{form.tipo === 'entrada' ? '📥 Entrada' : '📤 Salida'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Cantidad</span>
            <span className="font-mono font-semibold text-text">{form.cantidad} {unidad}</span>
          </div>
          {vehiculoSeleccionado && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Vehículo</span>
              <span className="text-right font-semibold text-text">
                {vehiculoSeleccionado.nombre} — {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
              </span>
            </div>
          )}
          {esCompra && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Compra</span>
              <span className="text-right font-semibold text-text">
                ${form.monto_compra} · {compradorSeleccionado?.nombre ?? 'sin comprador'}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-text-secondary">Stock actual</span>
            <span className="font-mono text-text">{productoSeleccionado?.stock_actual} {unidad}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Stock resultante</span>
            <span className="font-mono text-lg font-bold text-highlight">{stockResultante} {unidad}</span>
          </div>
        </div>
      </div>

      {dejaEnCero && (
        <p className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-center text-sm font-semibold text-error">
          ⚠️ Esta salida dejará el stock en {stockResultante <= 0 ? '0' : stockResultante}.
        </p>
      )}

      {dejaEnMinimo && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center text-sm font-semibold text-warning">
          ⚠️ Este producto quedará en stock mínimo.
        </p>
      )}

      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        style={{ minHeight: '56px' }}
        className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : 'Confirmar movimiento'}
      </button>
    </div>
  )
}
