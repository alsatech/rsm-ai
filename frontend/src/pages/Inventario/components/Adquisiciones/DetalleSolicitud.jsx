import { useCallback, useEffect, useState } from 'react'

import { autorizarSolicitud, getComparativoSolicitud, getSolicitud, rechazarSolicitud } from '../../../../api/inventario'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'
import { AREA_LABELS, ESTADO_SOLICITUD_CONFIG } from '../../constants'

const ROLES_AUTORIZAN = ['administrador', 'superadmin']
const ROLES_COMPRAN = ['operaciones', 'inventario', 'administrador', 'superadmin']
const ROLES_ENVIAN = ['operaciones', 'administrador', 'superadmin']
const ROLES_RECIBEN = ['campo', 'inventario', 'administrador', 'superadmin']
const ROLES_COMPARATIVO = ['inventario', 'administrador', 'superadmin']

const TIMELINE = [
  { estados: ['borrador', 'enviada', 'autorizada', 'rechazada', 'en_compra', 'enviada_rancho', 'recibida_parcial', 'recibida_completa'], label: 'Solicitud' },
  { estados: ['autorizada', 'en_compra', 'enviada_rancho', 'recibida_parcial', 'recibida_completa'], label: 'Autorización' },
  { estados: ['en_compra', 'enviada_rancho', 'recibida_parcial', 'recibida_completa'], label: 'Compra' },
  { estados: ['enviada_rancho', 'recibida_parcial', 'recibida_completa'], label: 'Envío' },
  { estados: ['recibida_parcial', 'recibida_completa'], label: 'Recepción' },
]

export default function DetalleSolicitud({ solicitudId, onVolver, onAbrirCompra, onAbrirEnvio, onAbrirRecepcion }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [solicitud, setSolicitud] = useState(null)
  const [comparativo, setComparativo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getSolicitud(solicitudId)
      setSolicitud(data)
      if (ROLES_COMPARATIVO.includes(user?.rol)) {
        try {
          const { data: comp } = await getComparativoSolicitud(solicitudId)
          setComparativo(comp)
        } catch {
          setComparativo(null)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [solicitudId, user?.rol])

  useEffect(() => { cargar() }, [cargar])

  if (loading || !solicitud) {
    return <p className="text-center text-sm text-text-secondary">Cargando solicitud…</p>
  }

  const cfg = ESTADO_SOLICITUD_CONFIG[solicitud.estado] ?? ESTADO_SOLICITUD_CONFIG.borrador
  const pasoActivo = TIMELINE.filter((t) => t.estados.includes(solicitud.estado)).length

  const handleAutorizar = async () => {
    const confirmado = await confirm({
      titulo: '¿Autorizar esta solicitud?',
      mensaje: `${solicitud.folio} quedará lista para que operaciones registre el envío.`,
      confirmText: 'Sí, autorizar',
      cancelText: 'Cancelar',
      variante: 'pregunta',
    })
    if (!confirmado) return
    setProcesando(true)
    try {
      await autorizarSolicitud(solicitud.id, { notas_autorizacion: notas })
      showToast('✅ Solicitud autorizada', 'exito')
      setNotas('')
      cargar()
    } catch {
      showToast('No se pudo autorizar la solicitud.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const handleRechazar = async () => {
    if (!notas.trim()) {
      showToast('Indica el motivo del rechazo en las notas.', 'alerta')
      return
    }
    const confirmado = await confirm({
      titulo: '¿Rechazar esta solicitud?',
      mensaje: notas,
      confirmText: 'Sí, rechazar',
      cancelText: 'Cancelar',
      variante: 'peligro',
    })
    if (!confirmado) return
    setProcesando(true)
    try {
      await rechazarSolicitud(solicitud.id, { notas_autorizacion: notas })
      showToast('Solicitud rechazada', 'alerta')
      setNotas('')
      cargar()
    } catch {
      showToast('No se pudo rechazar la solicitud.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-text-secondary">{solicitud.folio}</p>
            <h2 className="text-xl font-bold text-text">{AREA_LABELS[solicitud.area]}</h2>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${cfg.badge}`}>{cfg.label}</span>
        </div>
        <p className="mt-3 text-sm text-text-secondary">{solicitud.descripcion_necesidad}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span>Solicitó: {solicitud.solicitante_detalle?.nombre}</span>
          {solicitud.fecha_requerida && <span>Requerido: {solicitud.fecha_requerida}</span>}
          {solicitud.autorizado_por_detalle && <span>Autorizó: {solicitud.autorizado_por_detalle.nombre}</span>}
        </div>
        {solicitud.notas_autorizacion && (
          <p className="mt-2 rounded-lg bg-bg px-3 py-2 text-xs text-text-secondary">
            📝 {solicitud.notas_autorizacion}
          </p>
        )}
      </div>

      {solicitud.estado !== 'rechazada' && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-0 overflow-x-auto">
            {TIMELINE.map((t, i) => (
              <div key={t.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      i < pasoActivo ? 'bg-highlight text-bg' : 'bg-border/60 text-text-secondary'
                    }`}
                  >
                    {i < pasoActivo ? '✓' : i + 1}
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-text-secondary">{t.label}</span>
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className={`mx-2 h-px w-8 ${i < pasoActivo - 1 ? 'bg-highlight' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Materiales ({solicitud.items.length})
        </p>
        <div className="flex flex-col gap-2">
          {solicitud.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-bg px-3 py-2.5">
              <p className="text-sm font-semibold text-text">
                {item.producto_detalle?.descripcion || item.descripcion_libre}
                {item.es_producto_nuevo && <span className="ml-2 text-xs text-warning">(nuevo)</span>}
              </p>
              <p className="text-xs text-text-secondary">
                Solicitado: {item.cantidad_solicitada} {item.unidad} · Enviado: {item.cantidad_enviada} · Recibido: {item.cantidad_recibida}
              </p>
            </div>
          ))}
        </div>
      </div>

      {solicitud.compra && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Compra</p>
          <div className="flex items-start gap-4">
            <img
              src={solicitud.compra.foto_factura}
              alt="Factura"
              className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
            />
            <div className="flex flex-col gap-0.5 text-sm">
              <p className="font-semibold text-text">
                Compró: {solicitud.compra.comprado_por_detalle?.nombre}
              </p>
              <p className="text-text-secondary">Monto: ${solicitud.compra.monto_total}</p>
              {solicitud.compra.proveedor && <p className="text-text-secondary">Proveedor: {solicitud.compra.proveedor}</p>}
              <p className="text-text-secondary">Fecha: {solicitud.compra.fecha_compra}</p>
              {solicitud.compra.notas && <p className="text-text-secondary">📝 {solicitud.compra.notas}</p>}
            </div>
          </div>
        </div>
      )}

      {comparativo && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Comparativo enviado vs. recibido
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-secondary">
                <tr>
                  <th className="px-2 py-1">Ítem</th>
                  <th className="px-2 py-1">Solicitado</th>
                  <th className="px-2 py-1">Enviado</th>
                  <th className="px-2 py-1">Recibido</th>
                  <th className="px-2 py-1">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparativo.items.map((item) => (
                  <tr key={item.item_solicitud} className={Number(item.diferencia) !== 0 ? 'text-warning' : 'text-text'}>
                    <td className="px-2 py-2">{item.nombre}</td>
                    <td className="px-2 py-2 font-mono">{item.cantidad_solicitada}</td>
                    <td className="px-2 py-2 font-mono">{item.cantidad_enviada}</td>
                    <td className="px-2 py-2 font-mono">{item.cantidad_recibida}</td>
                    <td className="px-2 py-2 font-mono">
                      {Number(item.diferencia) !== 0 ? `${item.diferencia} ⚠️` : '✅'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {solicitud.estado === 'enviada' && ROLES_AUTORIZAN.includes(user?.rol) && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Autorización</p>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (obligatorias si rechazas)"
            className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleRechazar}
              disabled={procesando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-error text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={handleAutorizar}
              disabled={procesando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              Autorizar
            </button>
          </div>
        </div>
      )}

      {solicitud.estado === 'autorizada' && ROLES_COMPRAN.includes(user?.rol) && (
        <button
          type="button"
          onClick={() => onAbrirCompra(solicitud)}
          style={{ minHeight: '56px' }}
          className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90"
        >
          💰 Registrar compra
        </button>
      )}

      {solicitud.estado === 'en_compra' && ROLES_ENVIAN.includes(user?.rol) && (
        <button
          type="button"
          onClick={() => onAbrirEnvio(solicitud)}
          style={{ minHeight: '56px' }}
          className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90"
        >
          🚚 Registrar envío
        </button>
      )}

      {['enviada_rancho', 'recibida_parcial'].includes(solicitud.estado) && ROLES_RECIBEN.includes(user?.rol) && (
        <button
          type="button"
          onClick={() => onAbrirRecepcion(solicitud)}
          style={{ minHeight: '56px' }}
          className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90"
        >
          📥 Registrar recepción
        </button>
      )}

      <button
        type="button"
        onClick={onVolver}
        className="py-1 text-center text-sm text-text-secondary hover:text-text"
      >
        ← Volver a la lista
      </button>
    </div>
  )
}
