import { COLOR_MAP, ESTADO_CONFIG } from './colorConfig'

function formatFecha(fecha) {
  const [y, m, d] = fecha.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d} ${meses[parseInt(m) - 1]} ${y}`
}

const EN_CURSO_BADGE = {
  icon: '⏳',
  label: 'En curso',
  border: 'border-yellow-500',
  text: 'text-yellow-400',
  bg: 'bg-yellow-500/10',
}

export default function TarjetaRecorrido({ recorrido, onClick }) {
  const badge =
    recorrido.estado === 'en_curso'
      ? EN_CURSO_BADGE
      : { ...(ESTADO_CONFIG[recorrido.estado_hato] ?? ESTADO_CONFIG.bien), bg: '' }
  const lineColor = COLOR_MAP[recorrido.color] ?? '#60a5fa'
  const paradas = recorrido.paradas ?? []
  const ruta = paradas
    .map((p) => p.corraleta_detalle?.nombre ?? p.nombre_libre ?? 'Punto libre')
    .join(' → ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border-2 border-border bg-card p-4 text-left transition hover:border-accent active:scale-[0.98]"
    >
      {/* Barra de color del recorrido */}
      <div
        className="mb-3 h-1.5 w-full rounded-full"
        style={{ backgroundColor: lineColor }}
      />

      {/* Header: fecha + badge estado */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-highlight">
            {formatFecha(recorrido.fecha)}
          </p>
          <p className="text-base font-semibold text-text">
            {recorrido.responsable_detalle?.nombre}
          </p>
          {recorrido.asistentes_detalle?.length > 0 && (
            <p className="mt-0.5 text-sm text-text-secondary">
              👥 {recorrido.asistentes_detalle.map((a) => a.nombre).join(', ')}
            </p>
          )}
        </div>
        <div className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold ${badge.border} ${badge.text} ${badge.bg}`}>
          <span className="text-base">{badge.icon}</span>
          {badge.label}
        </div>
      </div>

      {/* Ruta */}
      {ruta && (
        <p className="mb-3 line-clamp-2 rounded-lg bg-bg/50 px-3 py-2 text-sm font-medium text-text-secondary">
          📍 {ruta}
        </p>
      )}

      {/* Narrativa */}
      {(recorrido.narrativa || recorrido.estado === 'en_curso') && (
        <p className="mb-3 line-clamp-2 text-sm text-text-secondary">
          {recorrido.narrativa || '⏳ Recorrido en progreso...'}
        </p>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-text-secondary">
        {recorrido.numero_cabezas && (
          <span className="flex items-center gap-1">
            🐄 <span className="text-base text-text">{recorrido.numero_cabezas} cabezas</span>
          </span>
        )}
        {paradas.length > 0 && (
          <span className="flex items-center gap-1">
            📍 <span className="text-base text-text">{paradas.length} paradas</span>
          </span>
        )}
        {recorrido.fotos?.length > 0 && (
          <span className="flex items-center gap-1">
            📷 <span className="text-base text-text">{recorrido.fotos.length} foto{recorrido.fotos.length > 1 ? 's' : ''}</span>
          </span>
        )}
        {recorrido.estado === 'en_curso' && (
          <span className="ml-auto text-sm font-bold text-yellow-400">
            Toca para continuar →
          </span>
        )}
      </div>
    </button>
  )
}
