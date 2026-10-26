import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import FormularioProveedor from './components/FormularioProveedor'
import ListaProveedores from './components/ListaProveedores'

const ROLES_CRUD = ['operaciones', 'administrador', 'superadmin']

export default function Proveedores() {
  const { user } = useAuth()
  const [vista, setVista] = useState('lista') // lista | formulario
  const [proveedorEditando, setProveedorEditando] = useState(null)
  const [recargar, setRecargar] = useState(0)

  const puedeEditar = ROLES_CRUD.includes(user?.rol)

  const handleNuevo = () => {
    setProveedorEditando(null)
    setVista('formulario')
  }

  const handleEditar = (proveedor) => {
    setProveedorEditando(proveedor)
    setVista('formulario')
  }

  const handleGuardado = () => {
    setVista('lista')
    setProveedorEditando(null)
    setRecargar((r) => r + 1)
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {vista === 'lista' ? (
              <Link
                to="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
              >
                ←
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setVista('lista')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="font-bold text-highlight">🧰 Proveedores</h1>
              <p className="text-xs text-text-secondary">Proveedores, contratistas y prestadores de servicio</p>
            </div>
          </div>

          {vista === 'lista' && puedeEditar && (
            <button
              type="button"
              onClick={handleNuevo}
              style={{ minHeight: '44px' }}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
            >
              + Nuevo proveedor
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-5">
        {vista === 'lista' && (
          <ListaProveedores recargar={recargar} puedeEditar={puedeEditar} onEditar={handleEditar} />
        )}

        {vista === 'formulario' && (
          <FormularioProveedor
            proveedor={proveedorEditando}
            onCancelar={() => setVista('lista')}
            onGuardado={handleGuardado}
          />
        )}
      </div>
    </div>
  )
}
