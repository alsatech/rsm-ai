import { useRef, useState } from 'react'

import { crearRecepcion } from '../../../../api/inventario'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/useToast'
import { ESTADO_ITEM_CONFIG } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const MAX_FOTOS = 4

const ESTADO_GENERAL_OPCIONES = [
  { value: 'completo', label: 'Completo' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'con_danios', label: 'Con daños' },
]

export default function ChecklistRecepcion({ solicitud, onCancelar, onRecibido }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const itemsEnviados = solicitud.items.filter((item) => Number(item.cantidad_enviada) > 0)

  const [checks, setChecks] = useState(() =>
    Object.fromEntries(
      itemsEnviados.map((item) => [
        item.id,
        { cantidad_recibida: item.cantidad_enviada, estado_item: 'ok', notas: '', foto: null },
      ])
    )
  )
  const [estadoGeneral, setEstadoGeneral] = useState('completo')
  const [fotosLlegada, setFotosLlegada] = useState([])
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  const actualizarCheck = (itemId, campo, valor) => {
    setChecks((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [campo]: valor } }))
  }

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setFotosLlegada((prev) => [...prev, ...files].slice(0, MAX_FOTOS))
    e.target.value = ''
  }

  const puedeGuardar = fotosLlegada.length >= 1

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('estado_general', estadoGeneral)
      const items = itemsEnviados.map((item) => ({
        item_solicitud: item.id,
        cantidad_recibida: checks[item.id].cantidad_recibida,
        estado_item: checks[item.id].estado_item,
        notas: checks[item.id].notas,
      }))
      fd.append('items', JSON.stringify(items))
      itemsEnviados.forEach((item) => {
        const foto = checks[item.id].foto
        if (foto) fd.append(`foto_item_${item.id}`, foto)
      })
      fotosLlegada.forEach((foto) => fd.append('fotos_llegada', foto))

      await crearRecepcion(solicitud.id, fd)
      showToast('✅ Recepción confirmada — productos actualizados en inventario', 'exito')
      onRecibido?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar la recepción.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-1 text-xl font-bold text-text">Recepción de material — {solicitud.folio}</h2>
      <p className="mb-4 text-sm text-text-secondary">Recibido por: {user?.nombre || user?.username}</p>

      <div className="flex flex-col gap-4">
        {itemsEnviados.map((item) => {
          const check = checks[item.id]
          return (
            <div key={item.id} className="rounded-xl border border-border bg-bg p-3">
              <p className="text-sm font-semibold text-text">
                {item.producto_detalle?.descripcion || item.descripcion_libre}
              </p>
              <p className="mb-2 text-xs text-text-secondary">Enviado: {item.cantidad_enviada} {item.unidad}</p>

              <label className="mb-1 block text-xs font-medium text-text-secondary">Cantidad recibida</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={check.cantidad_recibida}
                onChange={(e) => actualizarCheck(item.id, 'cantidad_recibida', e.target.value)}
                className={inputClass}
              />

              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.entries(ESTADO_ITEM_CONFIG).map(([value, cfg]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => actualizarCheck(item.id, 'estado_item', value)}
                    style={{ minHeight: '48px' }}
                    className={`rounded-lg border text-xs font-bold transition ${
                      check.estado_item === value ? cfg.activo : 'border-border text-text-secondary'
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>

              {check.estado_item !== 'ok' && (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Notas (opcional)"
                    value={check.notas}
                    onChange={(e) => actualizarCheck(item.id, 'notas', e.target.value)}
                    className={inputClass}
                  />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs text-text-secondary hover:border-highlight">
                    📷 {check.foto ? check.foto.name : 'Adjuntar foto de evidencia'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => actualizarCheck(item.id, 'foto', e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}
            </div>
          )
        })}

        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">Estado general de la recepción</p>
          <div className="grid grid-cols-3 gap-2">
            {ESTADO_GENERAL_OPCIONES.map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setEstadoGeneral(op.value)}
                style={{ minHeight: '48px' }}
                className={`rounded-lg border text-sm font-bold transition ${
                  estadoGeneral === op.value
                    ? 'border-highlight bg-highlight/10 text-highlight'
                    : 'border-border text-text-secondary'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Fotos de evidencia de llegada * ({fotosLlegada.length}/{MAX_FOTOS})
          </p>
          {fotosLlegada.length < MAX_FOTOS && (
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
          {fotosLlegada.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fotosLlegada.map((foto, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={URL.createObjectURL(foto)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotosLlegada((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
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
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : '✅ Confirmar recepción'}
        </button>
      </div>
    </div>
  )
}
