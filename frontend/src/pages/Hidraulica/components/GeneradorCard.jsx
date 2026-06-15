import { useState } from 'react'

import { crearChecklistGenerador, getChecklistGenerador } from '../../../api/hidraulica'
import { useToast } from '../../../hooks/useToast'
import ChecklistForm from './ChecklistForm'
import ChecklistHistorial from './ChecklistHistorial'

export default function GeneradorCard({ generador, puedeActualizarHoras, puedeVerAlertas, onActualizarHoras }) {
  const { showToast } = useToast()

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [guardandoChecklist, setGuardandoChecklist] = useState(false)

  const [horasInput, setHorasInput] = useState(generador.horas_operacion)
  const [actualizandoHoras, setActualizandoHoras] = useState(false)

  const handleToggleFormulario = async () => {
    const abrir = !mostrarFormulario
    setMostrarFormulario(abrir)

    if (abrir && historial.length === 0) {
      setCargandoHistorial(true)
      try {
        const { data } = await getChecklistGenerador(generador.id)
        setHistorial(data)
      } catch {
        showToast('No se pudo cargar el historial de revisiones', 'error')
      } finally {
        setCargandoHistorial(false)
      }
    }
  }

  const handleGuardarChecklist = async (data) => {
    setGuardandoChecklist(true)
    try {
      const { data: nuevo } = await crearChecklistGenerador(generador.id, data)
      setHistorial((prev) => [nuevo, ...prev])
      showToast('Revisión guardada correctamente', 'exito')
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'No se pudo guardar la revisión'
      showToast(mensaje, 'error')
      throw err
    } finally {
      setGuardandoChecklist(false)
    }
  }

  const handleActualizarHoras = async () => {
    setActualizandoHoras(true)
    try {
      await onActualizarHoras(generador.id, horasInput)
      showToast('Horas de operación actualizadas', 'exito')
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'No se pudieron actualizar las horas'
      showToast(mensaje, 'error')
    } finally {
      setActualizandoHoras(false)
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h3 className="text-lg font-bold text-text">{generador.nombre_display}</h3>
      <p className="text-sm text-text-secondary">{generador.marca_modelo}</p>
      <p className="mt-2 font-mono text-2xl text-highlight">{generador.horas_operacion} h</p>

      {puedeVerAlertas && generador.alertas_pendientes.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {generador.alertas_pendientes.map((alerta) => (
            <div
              key={alerta.id}
              className="rounded-lg border border-warning bg-warning/10 px-3 py-2 text-xs text-warning"
            >
              ⚠️ Mantenimiento requerido ({alerta.horas_intervalo} h): <strong>{alerta.tipo_servicio}</strong>
            </div>
          ))}
        </div>
      )}

      {puedeActualizarHoras && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={horasInput}
            onChange={(event) => setHorasInput(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-highlight"
          />
          <button
            type="button"
            onClick={handleActualizarHoras}
            disabled={actualizandoHoras}
            className="rounded-lg border border-highlight px-3 py-2 text-sm font-bold text-highlight transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actualizandoHoras ? '…' : 'Actualizar'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleFormulario}
        className="mt-4 rounded-lg bg-accent px-4 py-3 font-bold text-text transition hover:bg-highlight hover:text-bg"
      >
        {mostrarFormulario ? 'Ocultar revisión diaria' : 'Hacer revisión diaria'}
      </button>

      {mostrarFormulario && (
        <>
          <ChecklistForm onGuardar={handleGuardarChecklist} guardando={guardandoChecklist} />
          {cargandoHistorial ? (
            <p className="mt-3 text-sm text-text-secondary">Cargando historial…</p>
          ) : (
            <ChecklistHistorial registros={historial} />
          )}
        </>
      )}
    </div>
  )
}
