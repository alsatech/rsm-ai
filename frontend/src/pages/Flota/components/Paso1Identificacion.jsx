import { useEffect, useState } from 'react'

import { getSalidasPendientes } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { PROYECTOS_PLACEHOLDER, TIPO_ICONOS, TIPO_LABELS } from '../constants'

// Formato YYYY-MM-DD en local — el backend lo recibe tal cual para filtrar por día.
function fechaHoyISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fechaCorta(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function horaCorta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

// ¿La fecha del ISO corresponde al día de hoy en local?
function esDeHoy(iso) {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const hoy = new Date()
  return d.getFullYear() === hoy.getFullYear()
    && d.getMonth() === hoy.getMonth()
    && d.getDate() === hoy.getDate()
}

export default function Paso1Identificacion({ vehiculoPreseleccionado, form, setForm }) {
  const { user: usuarioActual } = useAuth()
  const noPuedeSalir = ['en_taller', 'de_baja'].includes(vehiculoPreseleccionado?.estado)

  const esLlegada = form.tipo_reporte === 'llegada'

  // Salidas pendientes — solo cuando se está capturando una llegada y hay vehículo.
  const [salidas, setSalidas] = useState([])
  const [cargandoSalidas, setCargandoSalidas] = useState(false)
  const [errorSalidas, setErrorSalidas] = useState(null)

  useEffect(() => {
    if (!esLlegada || !vehiculoPreseleccionado?.id) {
      setSalidas([])
      return
    }
    let cancelado = false
    setCargandoSalidas(true)
    setErrorSalidas(null)
    // dias_atras=1 → ventana [ayer, hoy]. El backend ya bloquea 2+ días de diferencia.
    getSalidasPendientes({ vehiculo: vehiculoPreseleccionado.id, fecha: fechaHoyISO(), dias_atras: 1 })
      .then(({ data }) => {
        if (cancelado) return
        setSalidas(data ?? [])
        // Si la salida que estaba seleccionada ya no está disponible, limpiarla.
        if (form.salida_relacionada && !data?.some((s) => s.id === form.salida_relacionada)) {
          setForm((prev) => ({ ...prev, salida_relacionada: null }))
        }
      })
      .catch(() => {
        if (cancelado) return
        setErrorSalidas('No se pudieron cargar las salidas del vehículo.')
      })
      .finally(() => {
        if (!cancelado) setCargandoSalidas(false)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esLlegada, vehiculoPreseleccionado?.id])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-flotafg-muted">Vehículo</p>
        {vehiculoPreseleccionado ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-highlight/60 bg-highlight/15 px-4 py-3">
            {vehiculoPreseleccionado.foto ? (
              <img
                src={vehiculoPreseleccionado.foto}
                alt={vehiculoPreseleccionado.nombre}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <span className="text-2xl">{TIPO_ICONOS[vehiculoPreseleccionado.tipo] ?? '🚗'}</span>
            )}
            <div>
              <p className="text-sm font-semibold text-flotafg">{vehiculoPreseleccionado.nombre}</p>
              <p className="text-xs text-flotafg-muted">
                {TIPO_LABELS[vehiculoPreseleccionado.tipo] ?? vehiculoPreseleccionado.tipo}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-error">No se seleccionó ningún vehículo.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-flotafg-muted">Tipo de reporte *</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !noPuedeSalir && setForm((prev) => ({ ...prev, tipo_reporte: 'salida' }))}
            disabled={noPuedeSalir}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border-2 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] ${
              form.tipo_reporte === 'salida'
                ? 'flota-cta-primary border-transparent'
                : 'border-flotafg-muted/30 text-flotafg-muted hover:border-flotafg hover:text-flotafg'
            }`}
          >
            🚗 Salida
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, tipo_reporte: 'llegada' }))}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border-2 text-base font-bold transition active:scale-[0.98] ${
              form.tipo_reporte === 'llegada'
                ? 'flota-cta-primary border-transparent'
                : 'border-flotafg-muted/30 text-flotafg-muted hover:border-flotafg hover:text-flotafg'
            }`}
          >
            🏁 Llegada
          </button>
        </div>
        {noPuedeSalir && (
          <p className="mt-2 text-xs font-semibold text-error">
            ⚠️ {vehiculoPreseleccionado.nombre} está {vehiculoPreseleccionado.estado === 'en_taller' ? 'en taller' : 'de baja'} — no puede salir hasta que se repare.
          </p>
        )}
      </div>

      {/* Proyecto — OPCIONAL en salidas. Si el vehículo se toma para un proyecto
          específico selecciónalo; si se usa para otra cosa (traslado, mantenimiento,
          comisión, etc.) déjalo vacío y acláralo en observaciones. */}
      {!esLlegada && (
        <div>
          <label className="mb-1 block text-sm font-medium text-flotafg-muted" htmlFor="proyecto">
            Proyecto <span className="text-xs font-normal text-flotafg-muted">(opcional)</span>
          </label>
          <select
            id="proyecto"
            value={form.proyecto ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, proyecto: e.target.value || null }))}
            className="w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-4 py-3 text-base text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
          >
            <option value="">— Ninguno (el vehículo no se usa para un proyecto) —</option>
            {PROYECTOS_PLACEHOLDER.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-flotafg-muted">
            Solo si el vehículo se va a usar para un proyecto específico. Si lo tomaste para otra cosa
            (traslado, mantenimiento, comisión administrativa, uso personal del rancho, etc.) déjalo en
            <span className="mx-1 font-semibold">"Ninguno"</span>
            y acláralo después en <span className="font-semibold">observaciones</span>.
          </p>
        </div>
      )}

      {/* Responsable — siempre el usuario logueado. Se muestra solo como confirmación, no se puede editar. */}
      {usuarioActual && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-flotafg-muted">Responsable</p>
          <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-flotabg/60 px-4 py-3 text-base text-flotafg">
            <span className="text-lg">👤</span>
            <span className="font-semibold">
              {usuarioActual.nombre || usuarioActual.username}
              {usuarioActual.username ? (
                <span className="ml-1 text-xs font-normal text-flotafg-muted">({usuarioActual.username})</span>
              ) : null}
            </span>
          </div>
          <p className="text-xs text-flotafg-muted">
            El checklist queda registrado a tu nombre automáticamente.
          </p>
        </div>
      )}

      {/* Salida que se está cerrando — solo en llegadas. La salida debe ser del mismo
          vehículo y del mismo día (regla validada también en backend). */}
      {esLlegada && (
        <div>
          <label className="mb-1 block text-sm font-medium text-flotafg-muted" htmlFor="salida_relacionada">
            Salida que estás cerrando <span className="text-error">*</span>
          </label>
          {cargandoSalidas ? (
            <p className="rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-4 py-3 text-sm text-flotafg-muted">
              Buscando salidas pendientes…
            </p>
          ) : errorSalidas ? (
            <p className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {errorSalidas}
            </p>
          ) : salidas.length === 0 ? (
            <p className="rounded-lg border border-warning/40 bg-warning/15 px-4 py-3 text-sm text-warning">
              ⚠️ No hay salidas pendientes para este vehículo (hoy ni ayer). Registra primero la salida y vuelve a abrir la llegada.
            </p>
          ) : (
            <>
              <select
                id="salida_relacionada"
                value={form.salida_relacionada ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, salida_relacionada: e.target.value || null }))
                }
                className="w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-4 py-3 text-base text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
              >
                <option value="" disabled>Selecciona la salida a cerrar</option>
                {salidas.map((s) => {
                  const hoy = esDeHoy(s.fecha_hora)
                  return (
                    <option key={s.id} value={s.id}>
                      {hoy ? '🟢 Hoy' : '🟡 Ayer'} · {horaCorta(s.fecha_hora)} · {s.responsable_detalle?.nombre ?? s.responsable_detalle?.username ?? 's/resp'} · {s.items_verificados}/{s.total_items} ítems
                    </option>
                  )
                })}
              </select>

              {/* Aviso contextual: la salida seleccionada es de AYER. */}
              {(() => {
                const sel = salidas.find((s) => String(s.id) === String(form.salida_relacionada))
                if (!sel || esDeHoy(sel.fecha_hora)) return null
                return (
                  <p className="mt-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-xs font-semibold text-warning">
                    ⚠️ Esta salida es de ayer ({fechaCorta(sel.fecha_hora)}). Verifica que el vehículo sigue en las mismas condiciones que al salir.
                  </p>
                )
              })()}

              {/* Aviso general: hay salidas pendientes sin cerrar (algunas pueden ser de ayer). */}
              {salidas.some((s) => !esDeHoy(s.fecha_hora)) && (
                <p className="mt-1 text-xs text-flotafg-muted">
                  Hay {salidas.filter((s) => !esDeHoy(s.fecha_hora)).length} salida(s) pendiente(s) de ayer — ciérralas primero para mantener el historial al día.
                </p>
              )}
              {salidas.length > 0 && salidas.every((s) => esDeHoy(s.fecha_hora)) && (
                <p className="mt-1 text-xs text-flotafg-muted">
                  Esta es la única salida pendiente para este vehículo.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}