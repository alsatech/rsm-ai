import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import DetalleRecorrido from './components/DetalleRecorrido'
import Historial from './components/Historial'
import WizardNuevoRecorrido from './components/WizardNuevoRecorrido'

export default function Ganado() {
  const { user } = useAuth()
  const [vista, setVista] = useState('historial')
  const [recorridoId, setRecorridoId] = useState(null)
  const [recargar, setRecargar] = useState(0)

  const puedeCrear = ['campo', 'administrador', 'superadmin'].includes(user?.rol)

  if (vista === 'nuevo') {
    return (
      <WizardNuevoRecorrido
        onVolver={() => setVista('historial')}
        onGuardado={() => {
          setVista('historial')
          setRecargar((r) => r + 1)
        }}
      />
    )
  }

  if (vista === 'detalle' && recorridoId) {
    return (
      <DetalleRecorrido
        id={recorridoId}
        onVolver={() => {
          setRecorridoId(null)
          setVista('historial')
        }}
      />
    )
  }

  return (
    <div className="min-h-svh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center justify-between">
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

          {puedeCrear && (
            <button
              type="button"
              onClick={() => setVista('nuevo')}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-highlight transition hover:opacity-90"
            >
              <span>+</span> Nuevo
            </button>
          )}
        </div>
      </header>

      {/* Historial */}
      <Historial
        recargar={recargar}
        onVerDetalle={(id) => {
          setRecorridoId(id)
          setVista('detalle')
        }}
        onNuevo={() => setVista('nuevo')}
      />
    </div>
  )
}
