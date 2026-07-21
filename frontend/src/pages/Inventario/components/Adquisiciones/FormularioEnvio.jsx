import { useRef, useState } from 'react'

import { enviarSolicitud } from '../../../../api/inventario'
import { useToast } from '../../../../hooks/useToast'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const MAX_FOTOS = 4

export default function FormularioEnvio({ solicitud, onCancelar, onEnviado }) {
  const { showToast } = useToast()
  const [cantidades, setCantidades] = useState(() =>
    Object.fromEntries(solicitud.items.map((item) => [item.id, item.cantidad_solicitada]))
  )
  const [vehiculo, setVehiculo] = useState('')
  const [notas, setNotas] = useState('')
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setFotos((prev) => [...prev, ...files].slice(0, MAX_FOTOS))
    e.target.value = ''
  }

  const puedeEnviar = fotos.length >= 1 && solicitud.items.some((item) => Number(cantidades[item.id]) > 0)

  const handleEnviar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      const items = solicitud.items
        .filter((item) => Number(cantidades[item.id]) > 0)
        .map((item) => ({ item_solicitud: item.id, cantidad_enviada: cantidades[item.id] }))
      fd.append('items', JSON.stringify(items))
      fd.append('vehiculo', vehiculo)
      fd.append('notas_envio', notas)
      fotos.forEach((foto) => fd.append('fotos', foto))

      await enviarSolicitud(solicitud.id, fd)
      showToast('✅ Envío registrado — la solicitud pasó a "Enviada al rancho"', 'exito')
      onEnviado?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar el envío.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">Registrar envío — {solicitud.folio}</h2>

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Cantidad a enviar por ítem
          </p>
          <div className="flex flex-col gap-3">
            {solicitud.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-bg p-3">
                <p className="text-sm font-semibold text-text">
                  {item.producto_detalle?.descripcion || item.descripcion_libre}
                </p>
                <p className="mb-2 text-xs text-text-secondary">Solicitado: {item.cantidad_solicitada} {item.unidad}</p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={cantidades[item.id] ?? ''}
                  onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="vehiculo" className="mb-1 block text-sm font-medium text-text-secondary">
            Vehículo de transporte
          </label>
          <input
            id="vehiculo"
            type="text"
            value={vehiculo}
            onChange={(e) => setVehiculo(e.target.value)}
            className={inputClass}
            placeholder="Ej. Sierra, camioncito, Chuy en la traila…"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Fotos de salida * ({fotos.length}/{MAX_FOTOS})
          </p>
          {fotos.length < MAX_FOTOS && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFile}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-4 text-sm font-semibold text-highlight transition hover:bg-bg"
              >
                📷 Tomar foto
              </button>
            </>
          )}
          {fotos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fotos.map((foto, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={URL.createObjectURL(foto)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notas_envio" className="mb-1 block text-sm font-medium text-text-secondary">
            Notas del envío
          </label>
          <textarea
            id="notas_envio"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancelar}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleEnviar}
          disabled={!puedeEnviar || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : '🚚 Registrar envío'}
        </button>
      </div>
    </div>
  )
}
