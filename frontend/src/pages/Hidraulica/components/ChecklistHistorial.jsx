import { CHECKLIST_GENERADOR_ITEMS } from '../constants'

const formatHora = (fechaHora) =>
  new Date(fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

const formatChecklist = (registro) => {
  const marcados = CHECKLIST_GENERADOR_ITEMS.filter((item) => registro[item.key]).map((item) => item.label)
  return marcados.length > 0 ? marcados.join(' · ') : 'Sin verificaciones marcadas'
}

export default function ChecklistHistorial({ registros }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const deHoy = registros.filter((registro) => registro.fecha_hora.slice(0, 10) === hoy)

  if (deHoy.length === 0) {
    return <p className="mt-3 text-sm text-text-secondary">Sin revisiones registradas hoy.</p>
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-sm font-bold text-text">Revisiones de hoy</p>
      {deHoy.map((registro) => (
        <div key={registro.id} className="rounded-lg border border-border bg-bg p-3 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span className="font-mono">{formatHora(registro.fecha_hora)}</span>
            <span>{registro.created_by_nombre}</span>
          </div>
          <p className="mt-1 text-text">{formatChecklist(registro)}</p>
          {registro.observaciones && <p className="mt-1 text-text-secondary">{registro.observaciones}</p>}
        </div>
      ))}
    </div>
  )
}
