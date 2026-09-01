import { useCallback, useEffect, useState } from 'react'

import { getSolicitud, getSolicitudes } from '../../../../api/inventario'
import { useToast } from '../../../../hooks/useToast'
import { AREA_LABELS, ESTADO_SOLICITUD_CONFIG } from '../../constants'
import RecepcionFacil from './RecepcionFacil'

// Pantalla única y directa para Campo: solo lo que llegó al rancho y sigue por recibir.
// Nada de dashboard, historial ni crear solicitudes — tocar una tarjeta abre el checklist.
const ESTADOS_PENDIENTES = 'enviada_rancho,recibida_parcial'

export default function RecepcionMaterialCampo() {
  const { showToast } = useToast()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [solicitudActiva, setSolicitudActiva] = useState(null)
  const [abriendo, setAbriendo] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    getSolicitudes({ estado: ESTADOS_PENDIENTES })
      .then(({ data }) => setSolicitudes(data))
      .catch(() => showToast('No se pudieron cargar los envíos pendientes.', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { cargar() }, [cargar])

  const abrirSolicitud = async (id) => {
    setAbriendo(true)
    try {
      const { data } = await getSolicitud(id)
      setSolicitudActiva(data)
    } catch {
      showToast('No se pudo abrir la solicitud.', 'error')
    } finally {
      setAbriendo(false)
    }
  }

  if (solicitudActiva) {
    return (
      <RecepcionFacil
        solicitud={solicitudActiva}
        onCancelar={() => setSolicitudActiva(null)}
        onRecibido={() => {
          setSolicitudActiva(null)
          cargar()
        }}
      />
    )
  }

  if (loading || abriendo) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">⏳</span>
        <p className="text-text-secondary">Un momento…</p>
      </div>
    )
  }

  if (solicitudes.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <span className="text-6xl">🎉</span>
        <p className="text-xl font-bold text-text">¡No hay nada pendiente!</p>
        <p className="text-text-secondary">Cuando llegue material nuevo, aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-base font-semibold text-text-secondary">
        👇 Toca lo que llegó para revisarlo
      </p>
      {solicitudes.map((s) => {
        const cfg = ESTADO_SOLICITUD_CONFIG[s.estado] ?? ESTADO_SOLICITUD_CONFIG.enviada_rancho
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => abrirSolicitud(s.id)}
            style={{ minHeight: '96px' }}
            className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-lg transition hover:border-highlight active:scale-[0.98]"
          >
            <span className="text-4xl">📦</span>
            <div className="flex-1">
              <p className="text-xl font-bold text-text">{AREA_LABELS[s.area]}</p>
              <p className="text-sm text-text-secondary">
                {s.items?.length ?? 0} material{(s.items?.length ?? 0) !== 1 ? 'es' : ''} por recibir
              </p>
              <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <span className="text-2xl text-text-secondary">→</span>
          </button>
        )
      })}
    </div>
  )
}
