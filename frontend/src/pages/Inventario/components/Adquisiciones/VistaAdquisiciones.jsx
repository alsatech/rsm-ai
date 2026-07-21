import { useState } from 'react'

import { createSolicitud } from '../../../../api/inventario'
import { useToast } from '../../../../hooks/useToast'
import ChecklistRecepcion from './ChecklistRecepcion'
import DetalleSolicitud from './DetalleSolicitud'
import FormularioEnvio from './FormularioEnvio'
import FormularioSolicitud from './FormularioSolicitud'
import ListaSolicitudes from './ListaSolicitudes'
import ReportesFaltantes from './ReportesFaltantes'

export default function VistaAdquisiciones({ onVolver }) {
  const { showToast } = useToast()
  const [seccion, setSeccion] = useState('solicitudes') // solicitudes | reportes
  const [vista, setVista] = useState('lista') // lista | nueva | detalle | envio | recepcion
  const [solicitudId, setSolicitudId] = useState(null)
  const [solicitudActiva, setSolicitudActiva] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [recargar, setRecargar] = useState(0)

  const irALista = () => {
    setVista('lista')
    setSolicitudId(null)
    setSolicitudActiva(null)
    setRecargar((r) => r + 1)
  }

  const handleCrearSolicitud = async (payload) => {
    setGuardando(true)
    try {
      const { data } = await createSolicitud(payload)
      showToast(
        payload.estado === 'borrador'
          ? `✅ Solicitud ${data.folio} guardada como borrador`
          : `✅ Solicitud ${data.folio} enviada para autorización`,
        'exito',
      )
      irALista()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo guardar la solicitud.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (vista === 'nueva') {
    return (
      <FormularioSolicitud onGuardar={handleCrearSolicitud} onCancelar={irALista} guardando={guardando} />
    )
  }

  if (vista === 'detalle' && solicitudId) {
    return (
      <DetalleSolicitud
        solicitudId={solicitudId}
        onVolver={irALista}
        onAbrirEnvio={(solicitud) => {
          setSolicitudActiva(solicitud)
          setVista('envio')
        }}
        onAbrirRecepcion={(solicitud) => {
          setSolicitudActiva(solicitud)
          setVista('recepcion')
        }}
      />
    )
  }

  if (vista === 'envio' && solicitudActiva) {
    return (
      <FormularioEnvio
        solicitud={solicitudActiva}
        onCancelar={() => setVista('detalle')}
        onEnviado={irALista}
      />
    )
  }

  if (vista === 'recepcion' && solicitudActiva) {
    return (
      <ChecklistRecepcion
        solicitud={solicitudActiva}
        onCancelar={() => setVista('detalle')}
        onRecibido={irALista}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSeccion('solicitudes')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            seccion === 'solicitudes'
              ? 'border-highlight bg-highlight/10 text-highlight'
              : 'border-border text-text-secondary hover:border-accent hover:text-text'
          }`}
        >
          📋 Solicitudes
        </button>
        <button
          type="button"
          onClick={() => setSeccion('reportes')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            seccion === 'reportes'
              ? 'border-highlight bg-highlight/10 text-highlight'
              : 'border-border text-text-secondary hover:border-accent hover:text-text'
          }`}
        >
          ⚠️ Faltantes y daños
        </button>
      </div>

      {seccion === 'solicitudes' && (
        <ListaSolicitudes
          recargar={recargar}
          onNuevaSolicitud={() => setVista('nueva')}
          onVerSolicitud={(id) => {
            setSolicitudId(id)
            setVista('detalle')
          }}
        />
      )}

      {seccion === 'reportes' && <ReportesFaltantes />}

      <button
        type="button"
        onClick={onVolver}
        className="py-1 text-center text-sm text-text-secondary hover:text-text"
      >
        ← Volver a inventario
      </button>
    </div>
  )
}
