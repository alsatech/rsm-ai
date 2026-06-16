import { useRef, useState } from 'react'

const LABEL_MOMENTO = {
  apertura: 'Apertura',
  seguimiento: 'Seguimiento',
  cierre: 'Cierre',
}

const BADGE_MOMENTO = {
  apertura: 'bg-error/20 text-error',
  seguimiento: 'bg-warning/20 text-warning',
  cierre: 'bg-highlight/20 text-highlight',
}

export default function FotosPendiente({
  fotos = [],
  pendienteId,
  puedeEliminar,
  onSubir,
  onEliminar,
  guardando,
}) {
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [momento, setMomento] = useState('seguimiento')
  const [descripcion, setDescripcion] = useState('')
  const [archivoFoto, setArchivoFoto] = useState(null)
  const fileInputRef = useRef(null)

  const fotosRestantes = 4 - fotos.length

  const handleSubir = async (e) => {
    e.preventDefault()
    if (!archivoFoto) return
    const fd = new FormData()
    fd.append('foto', archivoFoto)
    fd.append('momento', momento)
    if (descripcion) fd.append('descripcion', descripcion)
    await onSubir(fd)
    setArchivoFoto(null)
    setDescripcion('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text">Fotos</h3>
        <span className="text-sm text-text-secondary">{fotos.length}/4</span>
      </div>

      {fotos.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin fotos adjuntas.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative">
              <button
                type="button"
                onClick={() => setFotoAmpliada(foto)}
                className="block w-full overflow-hidden rounded-xl border border-border bg-card"
              >
                <img
                  src={foto.foto}
                  alt={foto.descripcion || 'Foto del pendiente'}
                  className="h-24 w-full object-cover"
                />
                <span
                  className={`block px-2 py-1 text-center text-xs font-bold ${BADGE_MOMENTO[foto.momento]}`}
                >
                  {LABEL_MOMENTO[foto.momento]}
                </span>
              </button>
              {puedeEliminar && (
                <button
                  type="button"
                  onClick={() => onEliminar(foto.id)}
                  className="absolute right-1 top-1 rounded-full bg-error/80 px-1.5 py-0.5 text-xs font-bold text-white"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {fotosRestantes > 0 && (
        <form onSubmit={handleSubir} className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4">
          <p className="text-sm text-text-secondary">Agregar foto ({fotosRestantes} disponible{fotosRestantes !== 1 ? 's' : ''})</p>

          <div>
            <p className="mb-1 text-sm text-[#86ef69]">Momento</p>
            <div className="grid grid-cols-3 gap-2">
              {['apertura', 'seguimiento', 'cierre'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMomento(m)}
                  style={{ minHeight: '52px' }}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    momento === m
                      ? 'border-highlight bg-accent text-highlight'
                      : 'border-border text-text-secondary hover:border-highlight'
                  }`}
                >
                  {LABEL_MOMENTO[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#86ef69]" htmlFor={`foto-input-${pendienteId}`}>
              Foto
            </label>
            <input
              ref={fileInputRef}
              id={`foto-input-${pendienteId}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setArchivoFoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-text-secondary"
            />
          </div>

          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción breve (opcional)"
            className="rounded-lg border border-border bg-card px-3 py-3 text-base text-text outline-none focus:border-highlight"
          />

          <button
            type="submit"
            disabled={!archivoFoto || guardando}
            style={{ minHeight: '56px' }}
            className="rounded-xl bg-accent px-4 py-3 font-bold text-text transition hover:bg-highlight hover:text-bg disabled:opacity-60"
          >
            {guardando ? 'Subiendo…' : 'Subir foto'}
          </button>
        </form>
      )}

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={fotoAmpliada.foto}
              alt={fotoAmpliada.descripcion || 'Foto'}
              className="w-full rounded-xl"
            />
            {fotoAmpliada.descripcion && (
              <p className="mt-2 text-center text-sm text-text-secondary">{fotoAmpliada.descripcion}</p>
            )}
            <button
              onClick={() => setFotoAmpliada(null)}
              style={{ minHeight: '52px' }}
              className="mt-4 w-full rounded-xl border border-border py-3 text-text-secondary hover:text-text"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
