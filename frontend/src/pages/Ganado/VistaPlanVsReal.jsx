import { useCallback, useEffect, useState } from 'react'

import { crearPlanDelDia, editarPlanDelDia, getCorraletas, getPlanDelDia, getRecorridos } from '../../api/ganado'
import { useToast } from '../../hooks/useToast'
import MapaComparacionPlanReal from './components/MapaComparacionPlanReal'
import SelectorCorraletasOrden from './components/SelectorCorraletasOrden'
import SelectorZonaCercas from './components/SelectorZonaCercas'

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}

function mensajeError(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const campo = Object.keys(data)[0]
  const error = data[campo]
  return Array.isArray(error) ? `${campo}: ${error[0]}` : fallback
}

export default function VistaPlanVsReal() {
  const { showToast } = useToast()
  const [fecha, setFecha] = useState(hoyISO())
  const [corraletas, setCorraletas] = useState([])
  const [plan, setPlan] = useState(null)
  const [finalizados, setFinalizados] = useState([])
  const [recorridoSeleccionadoId, setRecorridoSeleccionadoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formAbierto, setFormAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState([])
  const [narrativaPlan, setNarrativaPlan] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarSelectorZona, setMostrarSelectorZona] = useState(false)

  useEffect(() => {
    getCorraletas().then(({ data }) => setCorraletas(data)).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    setFormAbierto(false)
    setRecorridoSeleccionadoId(null)
    try {
      const [planResp, recorridosResp] = await Promise.all([
        getPlanDelDia(fecha).catch((err) => {
          if (err?.response?.status === 404) return { data: null }
          throw err
        }),
        getRecorridos({ fecha }),
      ])
      setPlan(planResp.data)
      const listaFinalizados = recorridosResp.data.filter((r) => r.estado === 'finalizado')
      setFinalizados(listaFinalizados)
      if (listaFinalizados.length > 0) setRecorridoSeleccionadoId(listaFinalizados[0].id)
    } catch {
      showToast('No se pudo cargar la información del día.', 'error')
    } finally {
      setLoading(false)
    }
  }, [fecha, showToast])

  useEffect(() => { cargar() }, [cargar])

  const abrirCrear = () => {
    setSeleccion([])
    setNarrativaPlan('')
    setFormAbierto(true)
  }

  const abrirEditar = () => {
    setSeleccion(
      [...plan.paradas]
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({ id: p.corraleta, nombre: p.corraleta_detalle?.nombre ?? p.nombre_libre })),
    )
    setNarrativaPlan(plan.narrativa ?? '')
    setFormAbierto(true)
  }

  const handleAgregar = (c) => {
    if (seleccion.some((s) => s.id === c.id)) return
    setSeleccion((prev) => [...prev, { id: c.id, nombre: c.nombre }])
  }

  const handleQuitarUltima = () => setSeleccion((prev) => prev.slice(0, -1))

  const handleAgregarDesdeZona = (corraletasZona) => {
    setSeleccion((prev) => {
      const nuevas = corraletasZona.filter((c) => !prev.some((s) => s.id === c.id))
      return [...prev, ...nuevas.map((c) => ({ id: c.id, nombre: c.nombre }))]
    })
    setMostrarSelectorZona(false)
    showToast(`✅ ${corraletasZona.length} corraleta${corraletasZona.length !== 1 ? 's' : ''} agregada${corraletasZona.length !== 1 ? 's' : ''} desde la zona`, 'exito')
  }

  const handleGuardar = async () => {
    if (seleccion.length === 0) {
      showToast('Agrega al menos una corraleta al plan.', 'error')
      return
    }
    const paradas = seleccion.map((c, i) => ({ corraleta_id: c.id, orden: i + 1 }))
    setGuardando(true)
    try {
      if (plan) {
        await editarPlanDelDia(plan.id, { paradas, narrativa_plan: narrativaPlan })
      } else {
        await crearPlanDelDia({ fecha, paradas, narrativa_plan: narrativaPlan })
      }
      showToast('✅ Plan del día guardado — el equipo de campo puede verlo', 'exito')
      setFormAbierto(false)
      cargar()
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo guardar el plan.'), 'error')
    } finally {
      setGuardando(false)
    }
  }

  const paradasPlan = plan ? [...plan.paradas].sort((a, b) => a.orden - b.orden) : []
  const real = finalizados.find((r) => r.id === recorridoSeleccionadoId) ?? null
  const paradasReal = real ? [...real.paradas].sort((a, b) => a.orden - b.orden) : []
  const idsVisitados = new Set(paradasReal.filter((p) => p.corraleta).map((p) => p.corraleta))
  const idsPlaneados = new Set(paradasPlan.filter((p) => p.corraleta).map((p) => p.corraleta))
  const extras = paradasReal.filter((p) => !(p.corraleta && idsPlaneados.has(p.corraleta)))
  const visitadasCount = paradasPlan.filter((p) => p.corraleta && idsVisitados.has(p.corraleta)).length
  const cumplimiento = paradasPlan.length ? Math.round((visitadasCount / paradasPlan.length) * 100) : 0

  return (
    <div className="min-h-svh bg-bg px-4 py-4">
      {/* Selector de fecha */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-text-secondary">Fecha</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-xl border-2 border-border bg-bg px-4 py-3 text-text focus:border-highlight focus:outline-none"
        />
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando...</p>}

      {!loading && (
        <div className="space-y-4">
          {/* Plan del día */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-highlight">📋 Plan del día</p>

            {!formAbierto && plan && (
              <div className="space-y-3">
                <p className="text-sm text-text">
                  {paradasPlan.map((p, i) => (
                    <span key={p.id}>
                      <span className="font-mono text-highlight">{i + 1}.</span>{' '}
                      <span>{p.corraleta_detalle?.nombre ?? p.nombre_libre}</span>
                      {i < paradasPlan.length - 1 && <span className="text-text-secondary"> → </span>}
                    </span>
                  ))}
                </p>
                {plan.narrativa && (
                  <p className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text-secondary">
                    “{plan.narrativa}”
                  </p>
                )}
                {plan.recorrido_vinculado_id ? (
                  <p className="text-xs font-semibold text-text-secondary">
                    🔒 No editable — ya hay un recorrido real vinculado a este plan.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={abrirEditar}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-highlight"
                  >
                    ✏️ Editar plan
                  </button>
                )}
              </div>
            )}

            {!formAbierto && !plan && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-text-secondary">No hay plan para esta fecha.</p>
                <button
                  type="button"
                  onClick={abrirCrear}
                  className="rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-highlight transition hover:opacity-90"
                >
                  + Crear plan del día
                </button>
              </div>
            )}

            {formAbierto && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setMostrarSelectorZona(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-highlight py-3 text-sm font-bold text-highlight transition hover:bg-accent"
                >
                  🗺️ Elegir por cerca
                </button>
                <SelectorCorraletasOrden
                  corraletas={corraletas}
                  seleccion={seleccion}
                  onAgregar={handleAgregar}
                  onQuitarUltima={handleQuitarUltima}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-secondary">
                    Instrucciones del día <span className="text-xs opacity-60">(opcional)</span>
                  </label>
                  <textarea
                    value={narrativaPlan}
                    onChange={(e) => setNarrativaPlan(e.target.value)}
                    rows={3}
                    placeholder="Ej: Pasar por el sector norte primero, revisar trampas de moscas en Búfalo..."
                    className="w-full resize-none rounded-xl border-2 border-border bg-bg px-4 py-3 text-sm text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormAbierto(false)}
                    className="flex-1 rounded-2xl border-2 border-border py-3 text-sm font-bold text-text-secondary transition hover:border-accent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="flex-1 rounded-2xl bg-highlight py-3 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
                  >
                    {guardando ? 'Guardando...' : 'Guardar plan del día'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comparación */}
          {(plan || real) && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-highlight">🔍 Comparación</p>

              {plan && !real && (
                <p className="mb-3 text-sm text-text-secondary">
                  El equipo de campo aún no ha salido — se muestra únicamente el plan.
                </p>
              )}
              {!plan && real && (
                <p className="mb-3 text-sm text-text-secondary">
                  No hubo plan del día registrado — se muestra únicamente el recorrido real.
                </p>
              )}

              {finalizados.length > 1 && (
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Comparar contra
                  </label>
                  <select
                    value={recorridoSeleccionadoId ?? ''}
                    onChange={(e) => setRecorridoSeleccionadoId(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-border bg-bg px-3 py-2 text-sm text-text focus:border-highlight focus:outline-none"
                  >
                    {finalizados.map((r, i) => {
                      const resp = r.responsable_detalle?.nombre ?? r.responsable_detalle?.username ?? `Recorrido ${i + 1}`
                      const hora = r.hora_fin ? new Date(r.hora_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
                      const paradasCount = r.paradas?.length ?? 0
                      return (
                        <option key={r.id} value={r.id}>
                          {resp} — {paradasCount} parada{paradasCount !== 1 ? 's' : ''}{hora ? ` · ${hora}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <MapaComparacionPlanReal plan={plan} real={real} />

              {plan && real && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-bg px-3 py-2">
                      <p className="font-bold text-text-secondary">PLAN DEL DÍA</p>
                      <p className="text-text">{paradasPlan.length} parada{paradasPlan.length !== 1 ? 's' : ''} planeada{paradasPlan.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-bg px-3 py-2">
                      <p className="font-bold text-text-secondary">RECORRIDO REAL</p>
                      <p className="text-text">{paradasReal.length} parada{paradasReal.length !== 1 ? 's' : ''} real{paradasReal.length !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {paradasPlan.map((p) => {
                      const visitada = p.corraleta && idsVisitados.has(p.corraleta)
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-text">{p.corraleta_detalle?.nombre ?? p.nombre_libre}</span>
                          <span className={visitada ? 'text-highlight' : 'text-error'}>
                            {visitada ? '✅ Visitada' : '❌ No visitada'}
                          </span>
                        </div>
                      )
                    })}
                    {extras.map((p) => (
                      <div key={`extra-${p.id}`} className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">➕ {p.corraleta_detalle?.nombre ?? p.nombre_libre} (extra)</span>
                        <span className="text-highlight">Visitada</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-text">Cumplimiento: {cumplimiento}%</span>
                      <span className="text-text-secondary">{visitadasCount} de {paradasPlan.length}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg">
                      <div
                        className="h-full rounded-full bg-highlight transition-all"
                        style={{ width: `${cumplimiento}%` }}
                      />
                    </div>
                  </div>

                  {plan.narrativa && (
                    <div className="rounded-xl border border-border bg-bg px-3 py-2">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Instrucciones de Alberto
                      </p>
                      <p className="text-sm text-text">“{plan.narrativa}”</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mostrarSelectorZona && (
        <SelectorZonaCercas
          corraletas={corraletas}
          onConfirmar={handleAgregarDesdeZona}
          onCerrar={() => setMostrarSelectorZona(false)}
        />
      )}
    </div>
  )
}
