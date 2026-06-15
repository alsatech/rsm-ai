import { Link, useNavigate } from 'react-router-dom'

import ModuleCard from '../../components/ModuleCard'
import { MODULOS } from '../../config/modules'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

const ROL_LABELS = {
  campo: 'Campo',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  administrador: 'Administrador',
  superadmin: 'Superadmin',
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const modulosVisibles = MODULOS.filter((modulo) => modulo.roles.includes(user?.rol))

  const handleLogout = () => {
    logout()
    showToast('Sesión cerrada', 'alerta')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-bg px-4 py-6 sm:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-highlight">RSM Sistema</h1>
          <p className="text-sm text-text-secondary">
            Hola, {user?.nombre} · {ROL_LABELS[user?.rol] ?? user?.rol}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-error hover:text-error"
        >
          Cerrar sesión
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modulosVisibles.map((modulo) => {
          const card = (
            <ModuleCard icono={modulo.icono} nombre={modulo.nombre} descripcion={modulo.descripcion} />
          )

          if (!modulo.ruta) {
            return <div key={modulo.id}>{card}</div>
          }

          return (
            <Link key={modulo.id} to={modulo.ruta} className="block">
              {card}
            </Link>
          )
        })}
      </div>

      {modulosVisibles.length === 0 && (
        <p className="mt-10 text-center text-text-secondary">
          No tienes módulos asignados todavía.
        </p>
      )}
    </div>
  )
}
