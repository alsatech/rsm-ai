import { useCallback, useEffect, useState } from 'react'

import { crearRelacionCompras, enviarRelacionCompras, getRelacionCompras, getRelacionesCompras } from '../../../../api/inventario'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROLES_GESTIONAN = ['inventario', 'superadmin']

const ESTADO_BADGE = {
  borrador: 'border-warning text-warning',
  enviada: 'border-highlight text-highlight',
}

function inicioDeSemana() {
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0 domingo … 6 sábado
  const offset = diaSemana === 0 ? 6 : diaSemana - 1 // lunes como inicio
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - offset)
  return lunes.toISOString().slice(0, 10)
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function RelacionComprasPanel() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const puedeGestionar = ROLES_GESTIONAN.includes(user?.rol)

  const [relaciones, setRelaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [relacionId, setRelacionId] = useState(null)
  const [relacion, setRelacion] = useState(null)
  const [fechaInicio, setFechaInicio] = useState(inicioDeSemana())
  const [fechaFin, setFechaFin] = useState(hoyISO())
  const [generando, setGenerando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cargarLista = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getRelacionesCompras()
      setRelaciones(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarLista() }, [cargarLista])

  const verDetalle = async (id) => {
    setRelacionId(id)
    const { data } = await getRelacionCompras(id)
    setRelacion(data)
  }

  const volverALista = () => {
    setRelacionId(null)
    setRelacion(null)
    cargarLista()
  }

  const handleGenerar = async () => {
    setGenerando(true)
    try {
      const { data } = await crearRelacionCompras({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      showToast(`✅ Relación ${data.folio} generada con ${data.compras.length} compra(s)`, 'exito')
      verDetalle(data.id)
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo generar la relación.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGenerando(false)
    }
  }

  const handleEnviar = async () => {
    const confirmado = await confirm({
      titulo: '¿Enviar esta relación a Alexia?',
      mensaje: `${relacion.folio} quedará marcada como enviada.`,
      confirmText: 'Sí, enviar',
      cancelText: 'Cancelar',
      variante: 'pregunta',
    })
    if (!confirmado) return
    setEnviando(true)
    try {
      const { data } = await enviarRelacionCompras(relacion.id)
      setRelacion(data)
      showToast('✅ Relación enviada a Alexia', 'exito')
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo enviar la relación.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setEnviando(false)
    }
  }

  if (relacionId && relacion) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-text-secondary">{relacion.folio}</p>
              <h2 className="text-xl font-bold text-text">
                {relacion.fecha_inicio} → {relacion.fecha_fin}
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${ESTADO_BADGE[relacion.estado]}`}
            >
              {relacion.estado_display}
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-highlight">${relacion.monto_total}</p>
          {relacion.enviada_en && (
            <p className="text-xs text-text-secondary">Enviada: {new Date(relacion.enviada_en).toLocaleString()}</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Compras incluidas ({relacion.compras.length})
          </p>
          <div className="flex flex-col gap-2">
            {relacion.compras.map((compra) => (
              <div key={compra.id} className="flex items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2.5">
                <img src={compra.foto_factura} alt="Factura" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text">
                    {compra.solicitud_folio || compra.producto_descripcion || 'Entrada directa'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Compró: {compra.comprado_por_detalle?.nombre} · {compra.fecha_compra}
                    {compra.proveedor && ` · ${compra.proveedor}`}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-text">${compra.monto_total}</p>
              </div>
            ))}
          </div>
        </div>

        {relacion.estado === 'borrador' && puedeGestionar && (
          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando}
            style={{ minHeight: '56px' }}
            className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : '📤 Enviar a Alexia'}
          </button>
        )}

        <button
          type="button"
          onClick={volverALista}
          className="py-1 text-center text-sm text-text-secondary hover:text-text"
        >
          ← Volver a la lista
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {puedeGestionar && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Generar relación de compras
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fecha_inicio" className="mb-1 block text-sm font-medium text-text-secondary">
                Desde
              </label>
              <input
                id="fecha_inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fecha_fin" className="mb-1 block text-sm font-medium text-text-secondary">
                Hasta
              </label>
              <input
                id="fecha_fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerar}
            disabled={generando}
            style={{ minHeight: '52px' }}
            className="mt-3 w-full rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {generando ? 'Generando…' : '+ Generar relación de esta semana'}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Historial</p>
        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}
        {!loading && relaciones.length === 0 && (
          <p className="text-sm text-text-secondary">Todavía no hay relaciones de compras generadas.</p>
        )}
        <div className="flex flex-col gap-2">
          {relaciones.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => verDetalle(r.id)}
              className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5 text-left transition hover:border-accent"
            >
              <div>
                <p className="font-mono text-xs text-text-secondary">{r.folio}</p>
                <p className="text-sm font-semibold text-text">
                  {r.fecha_inicio} → {r.fecha_fin}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-text-secondary">${r.monto_total}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${ESTADO_BADGE[r.estado]}`}>
                  {r.estado_display}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
