import { useRef } from 'react'

const MAX_FOTOS = 4

export default function Paso3Fotos({ fotos, onAgregar, onEliminar, guardando, onGuardar }) {
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const disponibles = MAX_FOTOS - fotos.length
    files.slice(0, disponibles).forEach((file) => {
      onAgregar({ file, preview: URL.createObjectURL(file) })
    })
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Agrega hasta 4 fotos del recorrido (opcional).
      </p>

      {/* Botón tomar foto */}
      {fotos.length < MAX_FOTOS && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="camera"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-5 text-base font-semibold text-highlight transition hover:bg-card"
          >
            <span className="text-2xl">📷</span>
            Tomar foto
          </button>
        </>
      )}

      {/* Miniaturas */}
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {fotos.map((f, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
              <img
                src={f.preview}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onEliminar(i)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error hover:bg-bg"
              >
                ✕
              </button>
              <span className="absolute bottom-2 left-2 rounded bg-bg/70 px-2 py-0.5 font-mono text-xs text-highlight">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-text-secondary">
        {fotos.length}/{MAX_FOTOS} fotos
      </p>

      {/* Botón guardar */}
      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? (
          <>
            <span className="animate-spin">⏳</span> Guardando...
          </>
        ) : (
          '✅ Guardar recorrido'
        )}
      </button>
    </div>
  )
}
