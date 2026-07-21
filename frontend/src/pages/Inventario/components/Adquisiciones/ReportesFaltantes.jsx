import { useCallback, useEffect, useState } from 'react'

import { createReporteFaltante, getReportesFaltantes, getUbicaciones, resolverReporteFaltante } from '../../../../api/inventario'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'
import { TIPO_REPORTE_CONFIG } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROLES_RESUELVEN = ['inventario', 'administrador', 'superadmin']

function formatFecha(fecha) {
  return new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function FormularioReporte({ onCancelar, onCreado }) {
  const { showToast } = useToast()
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('faltante')
  const [ubicacion, setUbicacion] = useState('')
  const [ubicaciones, setUbicaciones] = useState([])
  const [foto, setFoto] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getUbicaciones().then(({ data }) => setUbicaciones(data)).catch(() => setUbicaciones([]))
  }, [])

  const handleGuardar = async () => {
    if (!descripcion.trim()) return
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('descripcion', descripcion)
      fd.append('tipo', tipo)
      if (ubicacion) fd.append('ubicacion', ubicacion)
      if (foto) fd.append('foto', foto)
      await createReporteFaltante(fd)
      showToast('✅ Reporte enviado', 'exito')
      onCreado?.()
    } catch {
      showToast('No se pudo enviar el reporte.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">Nuevo reporte</h2>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">Tipo</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TIPO_REPORTE_CONFIG).map(([value, cfg]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTipo(value)}
                style={{ minHeight: '48px' }}
                className={`rounded-lg border text-xs font-bold transition ${
                  tipo === value ? cfg.badge : 'border-border text-text-secondary'
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-text-secondary">
            Descripción *
          </label>
          <textarea
            id="descripcion"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClass}
            placeholder="¿Qué está dañado o falta?"
          />
        </div>

        <div>
          <label htmlFor="ubicacion" className="mb-1 block text-sm font-medium text-text-secondary">
            Ubicación (opcional)
          </label>
          <select id="ubicacion" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={inputClass}>
            <option value="">Sin especificar</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre_display}</option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent py-4 text-sm font-semibold text-highlight hover:bg-bg">
          📷 {foto ? foto.name : 'Adjuntar foto (opcional)'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          />
        </label>
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
          disabled={!descripcion.trim() || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </div>
    </div>
  )
}

export default function ReportesFaltantes() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [reportes, setReportes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('abierto')
  const [mostrarForm, setMostrarForm] = useState(false)

  const puedeResolver = ROLES_RESUELVEN.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getReportesFaltantes(tab ? { estado: tab } : {})
      setReportes(data)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { cargar() }, [cargar])

  const resolver = async (reporte) => {
    const confirmado = await confirm({
      titulo: '¿Marcar como resuelto?',
      mensaje: `"${reporte.descripcion.slice(0, 60)}"`,
      confirmText: 'Sí, resolver',
      cancelText: 'Cancelar',
      variante: 'pregunta',
    })
    if (!confirmado) return
    try {
      await resolverReporteFaltante(reporte.id, {})
      showToast('✅ Reporte resuelto', 'exito')
      cargar()
    } catch {
      showToast('No se pudo resolver el reporte.', 'error')
    }
  }

  if (mostrarForm) {
    return (
      <FormularioReporte
        onCancelar={() => setMostrarForm(false)}
        onCreado={() => {
          setMostrarForm(false)
          cargar()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { value: 'abierto', label: 'Abiertos' },
            { value: 'en_seguimiento', label: 'En seguimiento' },
            { value: 'resuelto', label: 'Resueltos' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab === t.value
                  ? 'border-highlight bg-highlight/10 text-highlight'
                  : 'border-border text-text-secondary hover:border-accent hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          style={{ minHeight: '44px' }}
          className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
        >
          + Nuevo reporte
        </button>
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

      {!loading && reportes.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">✅</span>
          <p className="text-text-secondary">Sin reportes en este estado.</p>
        </div>
      )}

      {!loading && reportes.length > 0 && (
        <div className="flex flex-col gap-3">
          {reportes.map((r) => {
            const cfg = TIPO_REPORTE_CONFIG[r.tipo]
            return (
              <div key={r.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                {r.foto && (
                  <img src={r.foto} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${cfg.badge}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {r.producto_detalle && (
                      <span className="truncate text-xs text-text-secondary">{r.producto_detalle.descripcion}</span>
                    )}
                  </div>
                  <p className="text-sm text-text">{r.descripcion}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {r.reportado_por_detalle?.nombre} · {formatFecha(r.created_at)}
                  </p>
                </div>
                {puedeResolver && r.estado !== 'resuelto' && (
                  <button
                    type="button"
                    onClick={() => resolver(r)}
                    className="shrink-0 self-start text-xs font-bold text-highlight hover:underline"
                  >
                    Resolver
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
