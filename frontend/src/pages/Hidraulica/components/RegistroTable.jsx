import { ESTADO_BADGE } from '../constants'

const formatHora = (fechaHora) =>
  new Date(fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

const formatLecturas = (registro) => {
  const valores = []
  if (registro.nivel_pulgadas != null) valores.push(`${registro.nivel_pulgadas} pulg`)
  if (registro.caudal_m3h != null) valores.push(`${registro.caudal_m3h} m³/h`)
  if (registro.presion_psi != null) valores.push(`${registro.presion_psi} psi`)
  if (registro.lluvia_mm != null) valores.push(`${registro.lluvia_mm} mm`)
  return valores.length > 0 ? valores.join(' · ') : '—'
}

export default function RegistroTable({ registros, puedeValidar, onValidar }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-card text-text-secondary">
          <tr>
            <th className="px-4 py-3">Hora</th>
            <th className="px-4 py-3">Punto</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Lecturas</th>
            <th className="px-4 py-3">Capturó</th>
            <th className="px-4 py-3">Validado</th>
            {puedeValidar && <th className="px-4 py-3">Acción</th>}
          </tr>
        </thead>
        <tbody>
          {registros.map((registro) => (
            <tr key={registro.id} className="border-t border-border">
              <td className="px-4 py-3 font-mono text-text-secondary">{formatHora(registro.fecha_hora)}</td>
              <td className="px-4 py-3 text-text">{registro.nombre_punto_display}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full border px-2 py-1 text-xs font-bold ${ESTADO_BADGE[registro.estado]}`}>
                  {registro.estado_display}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-text-secondary">{formatLecturas(registro)}</td>
              <td className="px-4 py-3 text-text-secondary">{registro.created_by_nombre}</td>
              <td className="px-4 py-3">
                {registro.validado ? (
                  <span className="text-highlight">✅ {registro.validado_por_nombre}</span>
                ) : (
                  <span className="text-text-secondary">Pendiente</span>
                )}
              </td>
              {puedeValidar && (
                <td className="px-4 py-3">
                  {!registro.validado && (
                    <button
                      type="button"
                      onClick={() => onValidar(registro.id)}
                      className="rounded-lg border border-highlight px-3 py-1 text-xs font-bold text-highlight transition hover:bg-highlight hover:text-bg"
                    >
                      Validar
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
