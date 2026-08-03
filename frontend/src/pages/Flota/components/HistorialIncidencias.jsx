import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  crearAdvertenciaChecklist,
  getIncidencias,
  getVehiculos,
} from '../../../api/flota'
import { useToast } from '../../../hooks/useToast'

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Devuelve la incidencia que aplica según el tipo de reporte del checklist.
// Salida → preexistente (daños que ya traía el vehículo). Llegada → nueva (daños durante el uso).
function getIncidenciaActiva(checklist) {
  if (checklist.tipo_reporte === 'salida') {
    const texto = (checklist.incidencia_previa ?? '').trim()
    if (!texto) return null
    return {
      item: 'incidencia_previa',
      texto,
      fotos: checklist.fotos?.filter((f) => f.item === 'incidencia_previa') ?? [],
      icono: '⚠️',
      titulo: 'Daño preexistente',
    }
  }
  const texto = (checklist.incidencia_nueva ?? '').trim()
  if (!texto) return null
  return {
    item: 'incidencia_nueva',
    texto,
    fotos: checklist.fotos?.filter((f) => f.item === 'incidencia_nueva') ?? [],
    icono: '🚨',
    titulo: 'Daño nuevo / choque',
  }
}

// Modal ligero para agregar una nota (advertencia) al checklist.
function ModalNota({ checklist, onCerrar, onGuardar, guardando }) {
  const [motivo, setMotivo] = useState('')

  const handleEnviar = async () => {
    if (!motivo.trim()) return
    await onGuardar(motivo.trim())
    setMotivo('')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/30 p-4 backdrop-blur-md"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card-strong w-full max-w-md animate-[scaleIn_0.15s_ease-out] rounded-2xl p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-flotafg">📝 Nota de seguimiento</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-flotafg-muted/30 text-flotafg-muted hover:text-flotafg"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-flotafg-muted">
          Incidencia del {checklist.vehiculo_detalle?.nombre} · {formatFechaHora(checklist.fecha_hora)}
        </p>
        <textarea
          rows={4}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Se turnó al taller mecánico Juan Pérez para presupuesto…"
          className="w-full rounded-xl border border-flotafg-muted/30 bg-flotacard/60 px-3 py-2 text-sm text-flotafg outline-none transition focus:border-warning focus:ring-2 focus:ring-warning/30"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCerrar}
            style={{ minHeight: '44px' }}
            className="flex-1 rounded-lg border border-flotafg-muted/30 text-sm text-flotafg-muted hover:text-flotafg active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={guardando || !motivo.trim()}
            style={{ minHeight: '44px' }}
            className="flex-1 rounded-lg bg-warning text-sm font-bold text-bg transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {guardando ? 'Enviando…' : 'Enviar nota'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal para ampliar una foto.
function FotoAmpliada({ foto, onCerrar }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/40 p-4 backdrop-blur-md"
      onClick={onCerrar}
    >
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <img src={foto.foto} alt={foto.descripcion || 'Foto'} className="w-full rounded-xl" />
        <button
          onClick={onCerrar}
          style={{ minHeight: '48px' }}
          className="glass-card mt-3 w-full rounded-xl py-3 text-flotafg-muted hover:text-flotafg active:scale-[0.99]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

function TarjetaIncidencia({ checklist, onAgregarNota, onFotoAmpliada, onNotaGuardada }) {
  const inc = getIncidenciaActiva(checklist)
  if (!inc) return null

  const advertencias = checklist.advertencias ?? []
  const ultimaAdvertencia = advertencias[0]

  return (
    <div className="glass-card rounded-2xl border-2 border-warning/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-flotafg">
            {checklist.vehiculo_detalle?.nombre ?? 'Vehículo'}
          </p>
          <p className="text-xs text-flotafg-muted">
            {checklist.vehiculo_detalle?.tipo_display ?? ''} · {checklist.vehiculo_detalle?.placas ?? 'sin placas'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
            checklist.tipo_reporte === 'salida'
              ? 'bg-warning/20 text-warning'
              : 'bg-error/20 text-error'
          }`}>
            {checklist.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'}
          </span>
          <span className="text-xs text-flotafg-muted">{formatFechaHora(checklist.fecha_hora)}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{inc.icono}</span>
          <p className="text-sm font-bold text-flotafg">{inc.titulo}</p>
        </div>
        <p className="mt-2 text-sm text-flotafg">{inc.texto}</p>

        {inc.fotos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {inc.fotos.map((foto) => (
              <button
                key={foto.id}
                type="button"
                onClick={() => onFotoAmpliada(foto)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-warning/40 transition hover:scale-105"
                title="Ver foto"
              >
                <img src={foto.foto} alt="Foto de incidencia" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-flotafg-muted">
          👤 Reportado por {checklist.responsable_detalle?.nombre ?? '—'}
        </span>
        {advertencias.length > 0 && (
          <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 font-bold text-warning">
            📝 {advertencias.length} nota{advertencias.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {ultimaAdvertencia && (
        <div className="mt-2 rounded-lg border border-warning/30 bg-flotacard/60 px-3 py-2">
          <p className="text-xs font-semibold text-flotafg-muted">Última nota:</p>
          <p className="mt-1 text-sm text-flotafg">{ultimaAdvertencia.motivo}</p>
          <p className="mt-1 text-[11px] text-flotafg-muted">
            {ultimaAdvertencia.creada_por_detalle?.nombre ?? '—'} · {formatFechaHora(ultimaAdvertencia.created_at)}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onAgregarNota}
        style={{ minHeight: '44px' }}
        className="mt-3 w-full rounded-xl border border-warning/50 text-sm font-semibold text-warning transition hover:bg-warning/15 active:scale-[0.98]"
      >
        📝 Agregar nota de seguimiento
      </button>
    </div>
  )
}

export default function HistorialIncidencias({ onVolver, onNotaGuardadaExterno }) {
  const { showToast } = useToast()
  const [incidencias, setIncidencias] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [modalNota, setModalNota] = useState(null)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [guardandoNota, setGuardandoNota] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroVehiculo) params.vehiculo = filtroVehiculo
      if (filtroTipo) params.tipo = filtroTipo
      if (fechaDesde) params.fecha_desde = fechaDesde
      if (fechaHasta) params.fecha_hasta = fechaHasta
      const { data } = await getIncidencias(params)
      setIncidencias(data)
    } catch {
      showToast('No se pudieron cargar las incidencias.', 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroVehiculo, filtroTipo, fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    getVehiculos().then(({ data }) => setVehiculos(data)).catch(() => {})
  }, [])

  const handleGuardarNota = async (motivo) => {
    if (!modalNota) return
    setGuardandoNota(true)
    try {
      await crearAdvertenciaChecklist(modalNota.id, { motivo })
      showToast('✅ Nota agregada', 'exito')
      // Refresca la lista local para que aparezca la nota sin recargar.
      setIncidencias((prev) => prev.map((c) => {
        if (c.id !== modalNota.id) return c
        const nueva = {
          ...c,
          advertencias: [
            {
              id: Date.now(),
              motivo,
              created_at: new Date().toISOString(),
              creada_por_detalle: { nombre: 'Tú' },
            },
            ...(c.advertencias ?? []),
          ],
        }
        return nueva
      }))
      setModalNota(null)
      onNotaGuardadaExterno?.()
    } catch {
      showToast('No se pudo guardar la nota.', 'error')
    } finally {
      setGuardandoNota(false)
    }
  }

  const totalNotas = useMemo(
    () => incidencias.reduce((acc, c) => acc + (c.advertencias?.length ?? 0), 0),
    [incidencias],
  )

  return (
    <div className="min-h-svh bg-flotabg pb-10">
      <header className="sticky top-0 z-20">
        <div className="glass-card-strong flex items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-flotafg-muted/30 text-flotafg-muted transition hover:scale-105 hover:text-flotafg"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-flotafg">Historial de incidencias</h1>
            <p className="text-xs text-flotafg-muted">
              {incidencias.length} reporte{incidencias.length !== 1 ? 's' : ''}
              {totalNotas > 0 && ` · ${totalNotas} nota${totalNotas !== 1 ? 's' : ''} de seguimiento`}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={filtroVehiculo}
            onChange={(e) => setFiltroVehiculo(e.target.value)}
            className="glass-card rounded-lg px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
          >
            <option value="">Todos los vehículos</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="glass-card rounded-lg px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
          >
            <option value="">Todos los tipos</option>
            <option value="previa">Preexistentes (salida)</option>
            <option value="nueva">Nuevas / choques (llegada)</option>
          </select>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="glass-card rounded-lg px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
            title="Desde"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="glass-card rounded-lg px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
            title="Hasta"
          />
        </div>

        {loading && <p className="text-center text-sm text-flotafg-muted">Cargando…</p>}

        {!loading && incidencias.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🎉</span>
            <p className="text-flotafg-muted">No hay incidencias registradas.</p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-3">
            {incidencias.map((checklist, idx) => (
              <div
                key={checklist.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="flota-fade-in"
              >
                <TarjetaIncidencia
                  checklist={checklist}
                  onAgregarNota={() => setModalNota(checklist)}
                  onFotoAmpliada={setFotoAmpliada}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalNota && (
        <ModalNota
          checklist={modalNota}
          onCerrar={() => setModalNota(null)}
          onGuardar={handleGuardarNota}
          guardando={guardandoNota}
        />
      )}

      {fotoAmpliada && (
        <FotoAmpliada foto={fotoAmpliada} onCerrar={() => setFotoAmpliada(null)} />
      )}
    </div>
  )
}