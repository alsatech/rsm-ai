import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  actualizarHorasGenerador,
  createRegistro,
  getGeneradores,
  getRegistros,
  validarRegistro,
} from '../../api/hidraulica'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import GeneradoresSection from './components/GeneradoresSection'
import RegistroForm from './components/RegistroForm'
import RegistroTable from './components/RegistroTable'

export default function Hidraulica() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [generadores, setGeneradores] = useState([])
  const [loadingGeneradores, setLoadingGeneradores] = useState(true)
  const [errorGeneradores, setErrorGeneradores] = useState('')

  const puedeValidar = user?.rol === 'administrador' || user?.rol === 'superadmin'
  const puedeActualizarHorasGenerador = user?.rol === 'administrador' || user?.rol === 'superadmin'
  const puedeVerAlertasGenerador = user?.rol === 'administrador' || user?.rol === 'superadmin'

  const cargarRegistros = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      const { data } = await getRegistros({ fecha: hoy })
      setRegistros(data)
    } catch {
      setError('No se pudieron cargar los registros de hoy.')
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarGeneradores = useCallback(async () => {
    setLoadingGeneradores(true)
    setErrorGeneradores('')
    try {
      const { data } = await getGeneradores()
      setGeneradores(data)
    } catch {
      setErrorGeneradores('No se pudieron cargar los generadores.')
    } finally {
      setLoadingGeneradores(false)
    }
  }, [])

  useEffect(() => {
    cargarRegistros()
    cargarGeneradores()
  }, [cargarRegistros, cargarGeneradores])

  const handleGuardar = async (formData) => {
    setGuardando(true)
    try {
      await createRegistro(formData)
      showToast('Registro guardado correctamente', 'exito')
      await cargarRegistros()
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'No se pudo guardar el registro'
      showToast(mensaje, 'error')
      throw err
    } finally {
      setGuardando(false)
    }
  }

  const handleValidar = async (id) => {
    try {
      const { data } = await validarRegistro(id)
      setRegistros((prev) =>
        prev.map((registro) =>
          registro.id === id
            ? { ...registro, validado: data.validado, validado_por_nombre: data.validado_por_nombre }
            : registro
        )
      )
      showToast('Registro validado', 'exito')
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'No se pudo validar el registro'
      showToast(mensaje, 'error')
    }
  }

  const handleActualizarHorasGenerador = async (id, horasOperacion) => {
    const { data } = await actualizarHorasGenerador(id, horasOperacion)
    setGeneradores((prev) => prev.map((generador) => (generador.id === id ? data : generador)))
  }

  return (
    <div className="min-h-svh bg-bg px-4 py-6 sm:px-8">
      <header className="mb-6">
        <Link to="/dashboard" className="text-sm text-text-secondary hover:text-highlight">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold text-highlight">Hidráulica y Pluviómetros</h1>
        <p className="text-sm text-text-secondary">Captura de mediciones y validación diaria</p>
      </header>

      <RegistroForm onGuardar={handleGuardar} guardando={guardando} />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-text">Registros de hoy</h2>

        {loading && <p className="text-text-secondary">Cargando…</p>}
        {!loading && error && <p className="text-error">{error}</p>}
        {!loading && !error && registros.length === 0 && (
          <p className="text-text-secondary">Todavía no hay registros hoy.</p>
        )}
        {!loading && !error && registros.length > 0 && (
          <RegistroTable registros={registros} puedeValidar={puedeValidar} onValidar={handleValidar} />
        )}
      </section>

      {loadingGeneradores && <p className="mt-8 text-text-secondary">Cargando generadores…</p>}
      {!loadingGeneradores && errorGeneradores && <p className="mt-8 text-error">{errorGeneradores}</p>}
      {!loadingGeneradores && !errorGeneradores && generadores.length > 0 && (
        <GeneradoresSection
          generadores={generadores}
          puedeActualizarHoras={puedeActualizarHorasGenerador}
          puedeVerAlertas={puedeVerAlertasGenerador}
          onActualizarHoras={handleActualizarHorasGenerador}
        />
      )}
    </div>
  )
}
