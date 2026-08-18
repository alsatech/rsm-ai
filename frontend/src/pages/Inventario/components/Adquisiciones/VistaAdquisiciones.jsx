import { useState } from 'react'

import { createSolicitud } from '../../../../api/inventario'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/useToast'
import ChecklistRecepcion from './ChecklistRecepcion'
import DetalleSolicitud from './DetalleSolicitud'
import FormularioCompra from './FormularioCompra'
import FormularioEnvio from './FormularioEnvio'
import FormularioSolicitud from './FormularioSolicitud'
import ListaSolicitudes from './ListaSolicitudes'
import RelacionComprasPanel from './RelacionComprasPanel'
import ReportesFaltantes from './ReportesFaltantes'

const ROLES_VEN_RELACION = ['inventario', 'administrador', 'superadmin']

export default function VistaAdquisiciones({ onVolver, prefill }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [seccion, setSeccion] = useState('solicitudes') // solicitudes | reportes | relacion
  const [vista, setVista] = useState(() => (prefill ? 'nueva' : 'lista')) // lista | nueva | detalle | compra | envio | recepcion
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
      <FormularioSolicitud
        onGuardar={handleCrearSolicitud}
        onCancelar={irALista}
        guardando={guardando}
        prefill={prefill}
      />
    )
  }

  if (vista === 'detalle' && solicitudId) {
    return (
      <DetalleSolicitud
        solicitudId={solicitudId}
        onVolver={irALista}
        onAbrirCompra={(solicitud) => {
          setSolicitudActiva(solicitud)
          setVista('compra')
        }}
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

  if (vista === 'compra' && solicitudActiva) {
    return (
      <FormularioCompra
        solicitud={solicitudActiva}
        onCancelar={() => setVista('detalle')}
        onRegistrada={irALista}
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
        {ROLES_VEN_RELACION.includes(user?.rol) && (
          <button
            type="button"
            onClick={() => setSeccion('relacion')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              seccion === 'relacion'
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-accent hover:text-text'
            }`}
          >
            📊 Relación de compras
          </button>
        )}
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

      {seccion === 'relacion' && ROLES_VEN_RELACION.includes(user?.rol) && <RelacionComprasPanel />}

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
