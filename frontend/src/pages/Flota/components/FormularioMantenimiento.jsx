import { useEffect, useRef, useState } from 'react'

import { crearMantenimiento } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import FlotaLayout from './FlotaLayout'

const MAX_FOTOS = 12

// Mantenimiento de traila — misma idea que el checklist pero solo fotos + responsable.
// El responsable es el usuario logueado (lo asigna el backend).
export default function FormularioMantenimiento({ vehiculo, onVolver, onGuardado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const inputRef = useRef(null)
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const fotosRef = useRef([])

  // Libera las URLs de vista previa al salir.
  useEffect(() => {
    fotosRef.current = fotos
  }, [fotos])
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), [])

  const handleFiles = (e) => {
    const nuevas = Array.from(e.target.files).map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setFotos((prev) => [...prev, ...nuevas].slice(0, MAX_FOTOS))
    e.target.value = ''
  }

  const handleEliminar = (index) => {
    setFotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('vehiculo', String(vehiculo.id))
      fotos.forEach((f) => fd.append('fotos', f.file))
      await crearMantenimiento(fd)
      showToast('✅ Mantenimiento guardado', 'exito')
      onGuardado?.()
    } catch {
      showToast('No se pudo guardar el mantenimiento.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const headerContent = (
    <>
      <button
        type="button"
        onClick={onVolver}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-flotafg-muted/30 text-flotafg-muted transition hover:scale-105 hover:text-flotafg"
      >
        ←
      </button>
      <div className="flex-1">
        <h1 className="font-bold text-flotafg">Nuevo mantenimiento</h1>
        <p className="text-xs text-flotafg-muted">{vehiculo.nombre}</p>
      </div>
    </>
  )

  return (
    <FlotaLayout headerContent={headerContent}>
      <div className="flota-fade-in flex flex-col gap-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Responsable</p>
          <p className="text-lg font-bold text-flotafg">{user?.nombre || user?.username}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-flotafg">📷 Fotos del mantenimiento</h2>
              <p className="text-xs text-flotafg-muted">Toma varias fotos o elige varias de tu galería</p>
            </div>
            <span className="font-mono text-sm font-bold text-flotafg-muted">{fotos.length}/{MAX_FOTOS}</span>
          </div>

          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={fotos.length >= MAX_FOTOS}
            style={{ minHeight: '64px' }}
            className="glass-card flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-highlight/70 bg-highlight/5 text-base font-bold text-flotafg transition hover:-translate-y-0.5 hover:border-highlight hover:bg-highlight/10 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            📷 Tomar o elegir fotos
          </button>

          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((foto, i) => (
                <div key={foto.preview} className="relative aspect-square overflow-hidden rounded-xl">
                  <img src={foto.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleEliminar(i)}
                    aria-label="Eliminar foto"
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleGuardar}
          disabled={fotos.length === 0 || guardando}
          style={{ minHeight: '56px' }}
          className="flota-cta-primary w-full rounded-xl text-base disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar mantenimiento'}
        </button>
        {fotos.length === 0 && (
          <p className="text-center text-sm text-warning">⚠️ Sube al menos una foto para guardar.</p>
        )}
      </div>
    </FlotaLayout>
  )
}
