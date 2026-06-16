const ITEM = ({ label, count, colorClass }) => (
  <div className="flex flex-col items-center rounded-xl border border-border bg-bg px-4 py-3">
    <span className={`text-2xl font-bold font-mono ${colorClass}`}>{count}</span>
    <span className="mt-1 text-xs text-text-secondary">{label}</span>
  </div>
)

export default function ResumenPendientes({ resumen }) {
  if (!resumen) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-text">Pendientes</h3>
        {resumen.sin_actualizacion_3_dias > 0 && (
          <span className="rounded-full bg-error/20 px-2 py-0.5 text-xs font-bold text-error">
            {resumen.sin_actualizacion_3_dias} sin actualizar +3 días
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <ITEM label="Abiertos" count={resumen.abierto} colorClass="text-error" />
        <ITEM label="En proceso" count={resumen.en_proceso} colorClass="text-warning" />
        <ITEM label="Bloqueados" count={resumen.bloqueado} colorClass="text-orange-400" />
        <ITEM label="Cerrados" count={resumen.cerrado} colorClass="text-highlight" />
      </div>
    </div>
  )
}
