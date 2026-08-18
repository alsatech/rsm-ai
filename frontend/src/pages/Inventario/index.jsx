import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import VistaAdquisiciones from './components/Adquisiciones/VistaAdquisiciones'
import DashboardInventario from './components/DashboardInventario'
import HistorialMovimientos from './components/HistorialMovimientos'
import ListaProductos from './components/ListaProductos'
import VistaValidacion from './components/VistaValidacion'
import WizardMovimiento from './components/WizardMovimiento'

export default function Inventario() {
  const { user } = useAuth()
  const [vista, setVista] = useState('dashboard')
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)
  const [productoPreseleccionado, setProductoPreseleccionado] = useState(null)
  const [productoParaSolicitud, setProductoParaSolicitud] = useState(null)
  const [recargar, setRecargar] = useState(0)

  const puedeValidar = ['inventario', 'superadmin'].includes(user?.rol)
  const puedeVerHistorial = ['inventario', 'administrador', 'superadmin'].includes(user?.rol)

  const handleVerProductos = (categoriaId = null) => {
    setCategoriaFiltro(categoriaId)
    setVista('lista')
  }

  const handleNuevoMovimiento = (producto = null) => {
    setProductoPreseleccionado(producto)
    setVista('movimiento')
  }

  const handleVolver = () => {
    setVista('dashboard')
    setCategoriaFiltro(null)
    setProductoPreseleccionado(null)
    setProductoParaSolicitud(null)
  }

  const handleSolicitarMaterial = (producto) => {
    setProductoParaSolicitud(producto)
    setVista('adquisiciones')
  }

  const handleGuardado = () => {
    setVista('dashboard')
    setProductoPreseleccionado(null)
    setRecargar((r) => r + 1)
  }

  if (vista === 'movimiento') {
    return (
      <WizardMovimiento
        productoPreseleccionado={productoPreseleccionado}
        onVolver={() => setVista(productoPreseleccionado ? 'lista' : 'dashboard')}
        onGuardado={handleGuardado}
      />
    )
  }

  if (vista === 'validacion' && puedeValidar) {
    return <VistaValidacion onVolver={handleVolver} onCambio={() => setRecargar((r) => r + 1)} />
  }

  if (vista === 'historial' && puedeVerHistorial) {
    return <HistorialMovimientos onVolver={handleVolver} />
  }

  if (vista === 'adquisiciones') {
    return (
      <div className="min-h-svh bg-bg pb-10">
        <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVolver}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </button>
            <div>
              <h1 className="font-bold text-highlight">Adquisiciones</h1>
              <p className="text-xs text-text-secondary">Solicitudes, envíos y recepción de material</p>
            </div>
          </div>
        </header>
        <div className="px-4 py-5">
          <VistaAdquisiciones onVolver={handleVolver} prefill={productoParaSolicitud} />
        </div>
      </div>
    )
  }

  if (vista === 'lista') {
    return (
      <ListaProductos
        categoriaInicial={categoriaFiltro}
        recargar={recargar}
        onVolver={handleVolver}
        onNuevoMovimiento={handleNuevoMovimiento}
        onProductoCreado={() => setRecargar((r) => r + 1)}
      />
    )
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </Link>
            <div>
              <h1 className="font-bold text-highlight">Inventario</h1>
              <p className="text-xs text-text-secondary">Materiales, alimento, herramienta y combustibles</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVista('adquisiciones')}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              📦 Adquisiciones
            </button>
            {puedeValidar && (
              <button
                type="button"
                onClick={() => setVista('validacion')}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
              >
                ✓ Validar
              </button>
            )}
            {puedeVerHistorial && (
              <button
                type="button"
                onClick={() => setVista('historial')}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
              >
                📜 Historial
              </button>
            )}
            <button
              type="button"
              onClick={() => handleNuevoMovimiento(null)}
              style={{ minHeight: '44px' }}
              className="rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
            >
              + Movimiento
            </button>
          </div>
        </div>
      </header>

      <DashboardInventario
        recargar={recargar}
        onVerProductos={handleVerProductos}
        onSolicitarMaterial={handleSolicitarMaterial}
      />
    </div>
  )
}
