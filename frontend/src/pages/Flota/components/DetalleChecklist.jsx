import { useState } from 'react'

import {
  CARGA_TRAILA_ITEM,
  CHECKLIST_ITEMS,
  ESTADO_FISICO_INTERIOR,
  ESTADO_FISICO_ITEM,
  ESTADO_FISICO_LADOS,
  INCIDENCIA_NUEVA_ITEM,
  INCIDENCIA_PREVIA_ITEM,
  KILOMETRAJE_ITEM,
  TRAILA_ITEMS,
  esOffRoad,
  esTraila,
  sinKilometraje,
} from '../constants'
import AudiosChecklist from './AudiosChecklist'

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DetalleChecklist({ checklist, puedeValidar, onValidar, onAgregarAdvertencia, guardando, onCerrar }) {
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [observacionesValidacion, setObservacionesValidacion] = useState(checklist.observaciones ?? '')
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false)
  const [motivoAdvertencia, setMotivoAdvertencia] = useState('')

  const handleValidar = () => {
    onValidar({ validado: true, observaciones: observacionesValidacion })
  }

  const handleEnviarAdvertencia = async () => {
    if (!motivoAdvertencia.trim()) return
    await onAgregarAdvertencia(motivoAdvertencia.trim())
    setMotivoAdvertencia('')
    setMostrarAdvertencia(false)
  }

  const fotosPorItem = (key) => checklist.fotos?.filter((f) => f.item === key) ?? []
  const fotosGenerales = checklist.fotos?.filter((f) => !f.item) ?? []
  const unidad = esOffRoad(checklist.vehiculo_detalle?.tipo) ? 'hrs' : 'km'
  const esTrailaChecklist = esTraila(checklist.vehiculo_detalle?.tipo)
  const esLlegadaChecklist = checklist.tipo_reporte === 'llegada'
  const ocultarKilometraje = esTrailaChecklist || sinKilometraje(checklist.vehiculo_detalle?.tipo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg/30 p-4 backdrop-blur-md"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card-strong w-full max-w-lg animate-[scaleIn_0.15s_ease-out] rounded-2xl p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-flotafg">
              {checklist.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} — {checklist.vehiculo_detalle?.nombre}
            </h2>
            <p className="text-sm text-flotafg-muted">
              {checklist.responsable_detalle?.nombre} · {formatFechaHora(checklist.fecha_hora)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-flotafg-muted/30 text-flotafg-muted hover:text-flotafg"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="glass-card flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 text-sm">
            {!ocultarKilometraje && checklist.km_reporte != null && (
              <span className="font-mono text-flotafg">
                {Number(checklist.km_reporte).toLocaleString('es-MX')} {unidad}
              </span>
            )}
            <span className="font-semibold text-highlight">
              {checklist.items_verificados}/{checklist.total_items} ítems
            </span>
            {checklist.validado ? (
              <span className="ml-auto text-highlight">✅ Validado por {checklist.validado_por_detalle?.nombre}</span>
            ) : (
              <span className="ml-auto text-warning">⏳ Sin validar</span>
            )}
          </div>

          {/* Salida que está cerrando esta llegada (solo en llegadas). */}
          {checklist.tipo_reporte === 'llegada' && checklist.salida_relacionada_detalle?.id && (
            <div className="flex items-center gap-2 rounded-xl border border-highlight/40 bg-highlight/10 px-3 py-2 text-sm">
              <span className="text-lg">↩</span>
              <div className="flex-1">
                <p className="font-semibold text-flotafg">
                  Cierra salida #{checklist.salida_relacionada_detalle.id}
                </p>
                <p className="text-xs text-flotafg-muted">
                  {checklist.salida_relacionada_detalle.responsable_detalle?.nombre ?? '—'} ·{' '}
                  {formatFechaHora(checklist.salida_relacionada_detalle.fecha_hora)} ·{' '}
                  {checklist.salida_relacionada_detalle.items_verificados}/{checklist.salida_relacionada_detalle.total_items} ítems
                </p>
              </div>
            </div>
          )}

          {/* Para salidas: indica si quedó pendiente de cerrar (no hay llegada). */}
          {checklist.tipo_reporte === 'salida' && (
            <div className="flex items-center gap-2 rounded-xl border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm">
              <span className="text-lg">⏳</span>
              <p className="text-flotafg-muted">
                Esta salida se cierra cuando se registre la llegada del mismo vehículo el mismo día.
              </p>
            </div>
          )}

          {/* Proyecto al que se vincula — solo se muestra si está registrado (salidas lo
              piden obligatorio, llegadas lo heredan de su salida). */}
          {checklist.proyecto && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
              <span className="text-lg">📁</span>
              <div className="flex-1">
                <p className="font-semibold text-flotafg">{checklist.proyecto}</p>
                <p className="text-xs text-flotafg-muted">
                  {checklist.tipo_reporte === 'salida'
                    ? 'Proyecto al que se asocia esta salida'
                    : 'Proyecto heredado de la salida cerrada'}
                </p>
              </div>
            </div>
          )}

          {!esTrailaChecklist && (() => {
            // Salidas: foto del tablero (item='gasolina'). Llegadas: foto unificada (item='tablero').
            const fotosGasolina = [
              ...fotosPorItem('gasolina'),
              ...(esLlegadaChecklist ? fotosPorItem('tablero') : []),
            ]
            if (!fotosGasolina.length) return null
            return (
              <div className="glass-card flex items-center gap-2 rounded-lg px-3 py-2">
                <span className="text-xl">⛽</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-flotafg">
                    {esLlegadaChecklist ? 'Tablero (km + gasolina)' : 'Gasolina (foto del tablero)'}
                  </p>
                  <p className="text-xs text-flotafg-muted">Verificar nivel en la foto</p>
                </div>
                <div className="flex gap-1.5">
                  {fotosGasolina.map((foto) => (
                    <button
                      key={foto.id}
                      type="button"
                      onClick={() => setFotoAmpliada(foto)}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                    >
                      <img src={foto.foto} alt={esLlegadaChecklist ? 'Tablero' : 'Gasolina'} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          <div className="space-y-2">
            {checklist.items_aplicables?.map((key) => {
              if (key === 'kilometraje') {
                const fotos = fotosPorItem('kilometraje')
                return (
                  <div key={key} className="glass-card flex items-center gap-2 rounded-lg px-3 py-2">
                    <span className="text-xl">{KILOMETRAJE_ITEM.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-flotafg">
                        {esOffRoad(checklist.vehiculo_detalle?.tipo) ? 'Horas (horómetro)' : 'Kilometraje'}
                      </p>
                      <p className="text-xs text-flotafg-muted">
                        {checklist.km_reporte != null
                          ? `${Number(checklist.km_reporte).toLocaleString('es-MX')} ${unidad} (referencia informativa)`
                          : 'Valor no registrado — ver foto del tablero'}
                      </p>
                    </div>
                    {fotos.map((foto) => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() => setFotoAmpliada(foto)}
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                      >
                        <img src={foto.foto} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )
              }

              if (key === 'estado_fisico') {
                const fotoInterior = fotosPorItem(ESTADO_FISICO_INTERIOR.key)
                return (
                  <div key={key} className="glass-card rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ESTADO_FISICO_ITEM.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-flotafg">{ESTADO_FISICO_ITEM.label}</p>
                        <p className={`text-xs ${checklist.estado_fisico ? 'text-highlight' : 'text-error'}`}>
                          {checklist.estado_fisico ? '✓ Verificado' : '✕ Sin verificar'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ESTADO_FISICO_LADOS.map((lado) =>
                        fotosPorItem(lado.key).map((foto) => (
                          <button
                            key={foto.id}
                            type="button"
                            onClick={() => setFotoAmpliada(foto)}
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                            title={lado.label}
                          >
                            <img src={foto.foto} alt={lado.label} className="h-full w-full object-cover" />
                          </button>
                        ))
                      )}
                      {fotoInterior.map((foto) => (
                        <button
                          key={foto.id}
                          type="button"
                          onClick={() => setFotoAmpliada(foto)}
                          className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                          title={ESTADO_FISICO_INTERIOR.label}
                        >
                          <img src={foto.foto} alt={ESTADO_FISICO_INTERIOR.label} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }

              if (key === 'carga_traila') {
                const fotos = fotosPorItem('carga_traila')
                return (
                  <div key={key} className="glass-card flex items-center gap-2 rounded-lg px-3 py-2">
                    <span className="text-xl">{CARGA_TRAILA_ITEM.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-flotafg">{CARGA_TRAILA_ITEM.label}</p>
                      <p className={`text-xs ${checklist.traila_detalle ? 'text-highlight' : 'text-flotafg-muted'}`}>
                        {checklist.traila_detalle
                          ? `✓ ${checklist.traila_detalle.equipo || checklist.traila_detalle.nombre}`
                          : 'Sin seleccionar'}
                      </p>
                    </div>
                    {fotos.map((foto) => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() => setFotoAmpliada(foto)}
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                      >
                        <img src={foto.foto} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )
              }

              const config = [...CHECKLIST_ITEMS, ...TRAILA_ITEMS].find((i) => i.key === key)
              if (!config) return null
              const fotos = fotosPorItem(key)
              const verificado = Boolean(checklist[key])
              return (
                <div key={key} className="glass-card flex items-center gap-2 rounded-lg px-3 py-2">
                  <span className="text-xl">{config.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-flotafg">{config.label}</p>
                    <p className={`text-xs ${verificado ? 'text-highlight' : 'text-error'}`}>
                      {verificado ? '✓ Verificado' : '✕ Sin verificar'}
                    </p>
                  </div>
                  {fotos.map((foto) => (
                    <button
                      key={foto.id}
                      type="button"
                      onClick={() => setFotoAmpliada(foto)}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                    >
                      <img src={foto.foto} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Incidencias reportadas (daños preexistentes a la salida / nuevos a la llegada) */}
          {(() => {
            const item = checklist.tipo_reporte === 'salida' ? 'incidencia_previa' : 'incidencia_nueva'
            const config = checklist.tipo_reporte === 'salida' ? INCIDENCIA_PREVIA_ITEM : INCIDENCIA_NUEVA_ITEM
            const texto = (checklist[item] ?? '').trim()
            const fotos = fotosPorItem(item)
            if (!texto && !fotos.length) return null
            return (
              <div className="rounded-lg border border-warning/40 bg-warning/15 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{config.icon}</span>
                  <p className="text-sm font-semibold text-flotafg">{config.label}</p>
                </div>
                {texto && <p className="mt-1 text-sm text-flotafg">{texto}</p>}
                {fotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fotos.map((foto) => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() => setFotoAmpliada(foto)}
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-warning/40 transition hover:scale-105"
                        title="Ver foto"
                      >
                        <img src={foto.foto} alt={config.label} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {checklist.observaciones && !puedeValidar && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Observaciones</p>
              <p className="text-sm text-flotafg">{checklist.observaciones}</p>
            </div>
          )}

          {/* Audios (notas de voz). Solo visibles para los usuarios que validan
              — Abigail (administrador) y superadmin — porque son quienes revisan
              el reporte antes de marcar el checklist como validado. */}
          {puedeValidar && checklist.audios?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-flotafg-muted">
                🎙️ Notas de voz ({checklist.audios.length})
              </p>
              <AudiosChecklist
                audios={checklist.audios.map((a) => ({
                  id: a.id,
                  url: a.audio,
                  duracion_segundos: a.duracion_segundos,
                }))}
                mostrarHeader={false}
              />
            </div>
          )}

          {fotosGenerales.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-flotafg-muted">
                Fotos adicionales ({fotosGenerales.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {fotosGenerales.map((foto) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => setFotoAmpliada(foto)}
                    className="overflow-hidden rounded-lg border border-flotafg-muted/30 transition hover:scale-105"
                  >
                    <img src={foto.foto} alt={foto.descripcion || 'Foto de checklist'} className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {checklist.advertencias?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
                ⚠️ Advertencias ({checklist.advertencias.length})
              </p>
              <div className="flex flex-col gap-2">
                {checklist.advertencias.map((adv) => (
                  <div key={adv.id} className="rounded-lg border border-warning/40 bg-warning/15 px-3 py-2">
                    <p className="text-sm text-flotafg">{adv.motivo}</p>
                    <p className="mt-1 text-xs text-flotafg-muted">
                      {adv.creada_por_detalle?.nombre} · {formatFechaHora(adv.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {puedeValidar && (
            <div className="glass-card rounded-xl p-3">
              {!mostrarAdvertencia ? (
                <button
                  type="button"
                  onClick={() => setMostrarAdvertencia(true)}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-lg border border-warning/50 text-sm font-semibold text-warning transition hover:bg-warning/10 active:scale-[0.98]"
                >
                  ⚠️ Agregar warning al conductor
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-flotafg-muted" htmlFor="motivo-advertencia">
                    Motivo del warning
                  </label>
                  <textarea
                    id="motivo-advertencia"
                    rows={2}
                    value={motivoAdvertencia}
                    onChange={(e) => setMotivoAdvertencia(e.target.value)}
                    className="w-full rounded-lg border border-flotafg-muted/30 bg-flotacard/60 px-3 py-2 text-sm text-flotafg outline-none transition focus:border-warning focus:ring-2 focus:ring-warning/30"
                    placeholder="Ej. Llegó con el tanque casi vacío, recordar la regla de medio tanque."
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setMostrarAdvertencia(false); setMotivoAdvertencia('') }}
                      style={{ minHeight: '44px' }}
                      className="flex-1 rounded-lg border border-flotafg-muted/30 text-sm text-flotafg-muted hover:text-flotafg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleEnviarAdvertencia}
                      disabled={guardando || !motivoAdvertencia.trim()}
                      style={{ minHeight: '44px' }}
                      className="flex-1 rounded-lg bg-warning text-sm font-bold text-bg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    >
                      Enviar warning
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {puedeValidar && !checklist.validado && (
            <div className="glass-card rounded-xl p-3">
              <label className="mb-1 block text-sm font-medium text-flotafg-muted" htmlFor="obs-validacion">
                Observaciones de validación
              </label>
              <textarea
                id="obs-validacion"
                rows={2}
                value={observacionesValidacion}
                onChange={(e) => setObservacionesValidacion(e.target.value)}
                className="w-full rounded-lg border border-flotafg-muted/30 bg-flotacard/60 px-3 py-2 text-sm text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
                placeholder="Notas de la validación (opcional)"
              />
              <button
                type="button"
                onClick={handleValidar}
                disabled={guardando}
                style={{ minHeight: '48px' }}
                className="flota-cta-primary mt-3 w-full rounded-xl text-sm"
              >
                {guardando ? 'Guardando…' : '✅ Validar checklist'}
              </button>
            </div>
          )}
        </div>
      </div>

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/40 p-4 backdrop-blur-md"
          onClick={(e) => { e.stopPropagation(); setFotoAmpliada(null) }}
        >
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada.foto} alt={fotoAmpliada.descripcion || 'Foto'} className="w-full rounded-xl" />
            <button
              onClick={() => setFotoAmpliada(null)}
              style={{ minHeight: '48px' }}
              className="glass-card mt-3 w-full rounded-xl py-3 text-flotafg-muted hover:text-flotafg active:scale-[0.99]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}