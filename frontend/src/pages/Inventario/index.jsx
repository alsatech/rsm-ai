import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import RecepcionMaterialCampo from './components/Adquisiciones/RecepcionMaterialCampo'
import VistaAdquisiciones from './components/Adquisiciones/VistaAdquisiciones'
import DashboardInventario from './components/DashboardInventario'
import HistorialMovimientos from './components/HistorialMovimientos'
import ListaProductos from './components/ListaProductos'
import SalidaFacil from './components/SalidaFacil'
import VistaCancelacion from './components/VistaCancelacion'
import WizardMovimiento from './components/WizardMovimiento'

// Campo solo recibe material y registra lo que usa (+ Movimiento) — nada de dashboard de
// stock, historial, validación ni crear solicitudes: eso lo coordina Yajaira directamente.
export default function Inventario() {
  const { user } = useAuth()
  const esCampo = user?.rol === 'campo'
  const vistaInicio = esCampo ? 'recepcion-campo' : 'dashboard'
  const [vista, setVista] = useState(vistaInicio)
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)
  const [productoPreseleccionado, setProductoPreseleccionado] = useState(null)
  const [productoParaSolicitud, setProductoParaSolicitud] = useState(null)
  const [recargar, setRecargar] = useState(0)

  const puedeCancelar = ['inventario', 'superadmin'].includes(user?.rol)
  const puedeVerHistorial = ['inventario', 'administrador', 'superadmin'].includes(user?.rol)

  const handleVerProductos = (categoriaId = null) => {
    setCategoriaFiltro(categoriaId)
    setVista('lista')
  }

  const handleNuevoMovimiento = (producto = null) => {
    // Campo usa la versión "fácil" (escanear/escribir código, cantidad, destino) en vez del
    // wizard completo — nunca registra entradas ni necesita las opciones de compra/combustible
    // avanzadas, así que ni siquiera llega a ListaProductos para preseleccionar un producto.
    if (esCampo) {
      setVista('salida-facil')
      return
    }
    setProductoPreseleccionado(producto)
    setVista('movimiento')
  }

  const handleVolver = () => {
    setVista(vistaInicio)
    setCategoriaFiltro(null)
    setProductoPreseleccionado(null)
    setProductoParaSolicitud(null)
  }

  const handleSolicitarMaterial = (producto) => {
    setProductoParaSolicitud(producto)
    setVista('adquisiciones')
  }

  const handleGuardado = () => {
    setVista(vistaInicio)
    setProductoPreseleccionado(null)
    setRecargar((r) => r + 1)
  }

  if (vista === 'movimiento') {
    return (
      <WizardMovimiento
        productoPreseleccionado={productoPreseleccionado}
        onVolver={() => setVista(productoPreseleccionado ? 'lista' : vistaInicio)}
        onGuardado={handleGuardado}
      />
    )
  }

  if (vista === 'salida-facil') {
    return <SalidaFacil onVolver={handleVolver} onGuardado={handleGuardado} />
  }

  if (vista === 'cancelacion' && puedeCancelar) {
    return <VistaCancelacion onVolver={handleVolver} onCambio={() => setRecargar((r) => r + 1)} />
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
              <h1 className="font-bold text-highlight">
                {esCampo ? 'Recepción de material' : 'Inventario'}
              </h1>
              <p className="text-xs text-text-secondary">
                {esCampo ? 'Confirma lo que llegó al rancho' : 'Materiales, alimento, herramienta y combustibles'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!esCampo && (
              <button
                type="button"
                onClick={() => setVista('adquisiciones')}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
              >
                📦 Adquisiciones
              </button>
            )}
            {puedeCancelar && (
              <button
                type="button"
                onClick={() => setVista('cancelacion')}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
              >
                ✗ Cancelar
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

      {esCampo ? (
        <div className="px-4 py-5">
          <RecepcionMaterialCampo />
        </div>
      ) : (
        <DashboardInventario
          recargar={recargar}
          onVerProductos={handleVerProductos}
          onSolicitarMaterial={handleSolicitarMaterial}
        />
      )}
    </div>
  )
}
