import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import DashboardFacturacion from './components/DashboardFacturacion'
import ImportarFacturas from './components/ImportarFacturas'
import ListaFacturas from './components/ListaFacturas'

export default function Facturacion() {
  const { user } = useAuth()
  const [tab, setTab] = useState('dashboard') // dashboard | facturas | importar
  const esSuperadmin = user?.rol === 'superadmin'

  const TABS = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'facturas', label: 'Facturas' },
    ...(esSuperadmin ? [{ value: 'importar', label: 'Importar desde módulos' }] : []),
  ]

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            to="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </Link>
          <div>
            <h1 className="font-bold text-highlight">🧾 Facturación</h1>
            <p className="text-xs text-text-secondary">Facturas de gastos y compras · concentrado mensual</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab === t.value
                  ? 'border-highlight bg-highlight/10 text-highlight'
                  : 'border-border text-text-secondary hover:border-accent hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-5">
        {tab === 'dashboard' && <DashboardFacturacion />}
        {tab === 'facturas' && <ListaFacturas />}
        {tab === 'importar' && esSuperadmin && <ImportarFacturas />}
      </div>
    </div>
  )
}
