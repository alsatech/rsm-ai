import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Ganado from './pages/Ganado'
import SimulacionRecorrido from './pages/Ganado/SimulacionRecorrido'
import Hidraulica from './pages/Hidraulica'
import Login from './pages/Login'
import Pendientes from './pages/Pendientes'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hidraulica"
        element={
          <ProtectedRoute roles={['campo', 'administrador', 'superadmin']}>
            <Hidraulica />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pendientes"
        element={
          <ProtectedRoute roles={['campo', 'administrador', 'superadmin']}>
            <Pendientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ganado"
        element={
          <ProtectedRoute roles={['campo', 'administrador', 'superadmin']}>
            <Ganado />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ganado/simulacion"
        element={
          <ProtectedRoute roles={['superadmin']}>
            <SimulacionRecorrido />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
