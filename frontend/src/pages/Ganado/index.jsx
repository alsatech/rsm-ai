import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { useGanadoSync } from '../../hooks/useGanadoSync'
import DetalleRecorrido from './components/DetalleRecorrido'
import TabsGanado from './components/TabsGanado'
import HeatmapPastoreo from './HeatmapPastoreo'
import Historial from './components/Historial'
import VistaClasificacion from './VistaClasificacion'
import VistaPlanVsReal from './VistaPlanVsReal'
import WizardNuevoRecorrido from './components/WizardNuevoRecorrido'

const TABS = [
  { id: 'historial', label: 'Recorridos', soloAdmin: false },
  { id: 'heatmap', label: 'Heatmap', soloAdmin: true },
  { id: 'clasificacion', label: 'Clasificación', soloAdmin: true },
  { id: 'planvsreal', label: 'Plan vs Real', soloAdmin: true },
]

export default function Ganado() {
  const { user } = useAuth()
  const [vista, setVista] = useState('historial')
  const [recorridoId, setRecorridoId] = useState(null)
  const [recorridoActivo, setRecorridoActivo] = useState(null)
  const [recargar, setRecargar] = useState(0)

  useGanadoSync()

  const puedeCrear = ['campo', 'administrador', 'superadmin'].includes(user?.rol)
  const puedeVerHeatmap = ['administrador', 'superadmin'].includes(user?.rol)
  const puedeVerAnalitica = ['administrador', 'superadmin'].includes(user?.rol)
  const puedeSimular = user?.rol === 'superadmin'
  const tabsVisibles = TABS.filter((t) => !t.soloAdmin || puedeVerAnalitica)

  const handleVerDetalle = (recorrido) => {
    if (recorrido.estado === 'en_curso' && puedeCrear) {
      setRecorridoActivo(recorrido)
      setVista('nuevo')
    } else {
      setRecorridoId(recorrido.id)
      setVista('detalle')
    }
  }

  const handleVolver = () => {
    setRecorridoActivo(null)
    setRecorridoId(null)
    setVista('historial')
  }

  const handleGuardado = () => {
    setRecorridoActivo(null)
    setVista('historial')
    setRecargar((r) => r + 1)
  }

  if (vista === 'nuevo') {
    return (
      <WizardNuevoRecorrido
        recorridoInicial={recorridoActivo}
        onVolver={handleVolver}
        onGuardado={handleGuardado}
      />
    )
  }

  if (vista === 'detalle' && recorridoId) {
    return (
      <DetalleRecorrido
        id={recorridoId}
        onVolver={handleVolver}
      />
    )
  }

  if (vista === 'heatmap' && puedeVerHeatmap) {
    return <HeatmapPastoreo onVolver={handleVolver} />
  }

  if (vista === 'clasificacion' && puedeVerAnalitica) {
    return (
      <div className="min-h-svh bg-bg">
        <CabeceraGanado
          onVolver={handleVolver}
          tabsVisibles={tabsVisibles}
          vista={vista}
          setVista={setVista}
        />
        <VistaClasificacion />
      </div>
    )
  }

  if (vista === 'planvsreal' && puedeVerAnalitica) {
    return (
      <div className="min-h-svh bg-bg">
        <CabeceraGanado
          onVolver={handleVolver}
          tabsVisibles={tabsVisibles}
          vista={vista}
          setVista={setVista}
        />
        <VistaPlanVsReal />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </Link>
            <div>
              <h1 className="font-bold text-highlight">Ganado</h1>
              <p className="text-xs text-text-secondary">Recorridos del hato</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {puedeSimular && (
              <Link
                to="/ganado/simulacion"
                className="flex items-center gap-2 rounded-xl border border-[#f97316]/60 px-3 py-2.5 text-sm font-semibold text-[#f97316] transition hover:bg-[#f97316]/10"
              >
                🧪 Modo simulación
              </Link>
            )}
            {puedeCrear && (
              <button
                type="button"
                onClick={() => { setRecorridoActivo(null); setVista('nuevo') }}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-highlight transition hover:opacity-90"
              >
                <span>+</span> Nuevo
              </button>
            )}
          </div>
        </div>
        {tabsVisibles.length > 1 && (
          <TabsGanado tabs={tabsVisibles} vistaActual={vista} onCambiar={setVista} />
        )}
      </header>

      <Historial
        recargar={recargar}
        onVerDetalle={handleVerDetalle}
        onNuevo={() => { setRecorridoActivo(null); setVista('nuevo') }}
      />
    </div>
  )
}

function CabeceraGanado({ onVolver, tabsVisibles, vista, setVista }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg">
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onVolver}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
        >
          ←
        </button>
        <div>
          <h1 className="font-bold text-highlight">Ganado</h1>
          <p className="text-xs text-text-secondary">Recorridos del hato</p>
        </div>
      </div>
      <TabsGanado tabs={tabsVisibles} vistaActual={vista} onCambiar={setVista} />
    </header>
  )
}
