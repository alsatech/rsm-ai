import { useState } from 'react'

function formatFechaHora(valor) {
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistorialMantenimientos({ mantenimientos }) {
  const [ampliada, setAmpliada] = useState(null)

  if (!mantenimientos.length) {
    return <p className="text-sm italic text-flotafg-muted">Sin mantenimientos registrados.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {mantenimientos.map((m) => (
        <div key={m.id} className="rounded-xl border border-flotafg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-flotafg">
              🔧 {m.responsable_detalle?.nombre ?? 'Sin responsable'}
            </p>
            <p className="text-xs text-flotafg-muted">{formatFechaHora(m.fecha_hora)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {m.fotos.map((foto, i) => (
              <button
                key={foto.id}
                type="button"
                onClick={() => setAmpliada(foto.foto)}
                className="aspect-square overflow-hidden rounded-lg"
              >
                <img src={foto.foto} alt={`Foto ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {ampliada && (
        <div
          role="dialog"
          onClick={() => setAmpliada(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <img src={ampliada} alt="Foto del mantenimiento" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
