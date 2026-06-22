import { ESTADO } from '../estadoConfig'

const BOX_ESTADOS = [
  { key: 'abierto', label: 'Abiertos' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'bloqueado', label: 'Bloqueados' },
  { key: 'cerrado', label: 'Cerrados' },
]

export default function ResumenPendientes({ resumen }) {
  if (!resumen) return null

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-white">Resumen de pendientes</h3>
        {resumen.sin_actualizacion_3_dias > 0 && (
          <span
            className="rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-400"
            style={{ boxShadow: '0 0 8px rgba(220,38,38,0.3)' }}
          >
            ⚠ {resumen.sin_actualizacion_3_dias} sin mover +3 días
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {BOX_ESTADOS.map(({ key, label }) => {
          const conf = ESTADO[key]
          const count = resumen[key] ?? 0
          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-3"
              style={{ boxShadow: count > 0 ? `0 0 14px ${conf.glowRgba}` : 'none' }}
            >
              <span className="mb-1 text-xl leading-none">{conf.icon}</span>
              <span
                className={`text-2xl font-black font-mono leading-none ${conf.textColor}`}
                style={{ textShadow: count > 0 ? `0 0 12px ${conf.glowRgba}` : 'none' }}
              >
                {count}
              </span>
              <span className="mt-1.5 text-center text-xs leading-tight text-zinc-500">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
