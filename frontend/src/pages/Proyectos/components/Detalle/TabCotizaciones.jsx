import { useCallback, useEffect, useRef, useState } from 'react'

import { aprobarCotizacion, createCotizacion, getCotizaciones } from '../../../../api/proyectos'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'
import { ESTADO_COTIZACION_CONFIG, formatFecha, formatMoneda } from '../../constants'
import SelectorContratista from './SelectorContratista'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROLES_GESTIONAN = ['operaciones', 'superadmin']
const ROLES_APRUEBAN = ['superadmin']

function FormularioCotizacion({ proyectoId, onCancelar, onCreada }) {
  const { showToast } = useToast()
  const [contratista, setContratista] = useState('')
  const [descripcionTrabajo, setDescripcionTrabajo] = useState('')
  const [monto, setMonto] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  const puedeGuardar = Boolean(contratista && descripcionTrabajo.trim() && Number(monto) > 0)

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('contratista', contratista)
      fd.append('descripcion_trabajo', descripcionTrabajo)
      fd.append('monto', monto)
      if (archivo) fd.append('archivo_cotizacion', archivo)
      await createCotizacion(proyectoId, fd)
      showToast('✅ Cotización registrada', 'exito')
      onCreada()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar la cotización.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-bold text-text">Nueva cotización de mano de obra</h3>
      <div className="flex flex-col gap-4">
        <SelectorContratista value={contratista} onChange={setContratista} />
        <div>
          <label htmlFor="descripcion_trabajo" className="mb-1 block text-sm font-medium text-text-secondary">
            Descripción del trabajo *
          </label>
          <textarea
            id="descripcion_trabajo"
            rows={3}
            value={descripcionTrabajo}
            onChange={(e) => setDescripcionTrabajo(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="monto_cotizacion" className="mb-1 block text-sm font-medium text-text-secondary">
            Monto *
          </label>
          <input
            id="monto_cotizacion"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={inputClass}
            placeholder="$0.00"
          />
        </div>
        <div>
          <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-4 text-sm font-semibold text-highlight transition hover:bg-bg"
          >
            📎 {archivo ? archivo.name : 'Adjuntar cotización (opcional)'}
          </button>
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
          {guardando ? 'Guardando…' : '💰 Registrar cotización'}
        </button>
      </div>
    </div>
  )
}

export default function TabCotizaciones({ proyecto }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  const puedeCrear = ROLES_GESTIONAN.includes(user?.rol)
  const puedeAprobar = ROLES_APRUEBAN.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getCotizaciones(proyecto.id)
      setCotizaciones(data)
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { cargar() }, [cargar])

  const procesar = async (cotizacion, accion) => {
    const confirmado = await confirm({
      titulo: accion === 'aprobar' ? '¿Aprobar esta cotización?' : '¿Rechazar esta cotización?',
      mensaje: `${cotizacion.contratista_detalle?.nombre} — ${formatMoneda(cotizacion.monto)}`,
      confirmText: accion === 'aprobar' ? 'Sí, aprobar' : 'Sí, rechazar',
      cancelText: 'Cancelar',
      variante: accion === 'aprobar' ? 'pregunta' : 'peligro',
    })
    if (!confirmado) return
    try {
      await aprobarCotizacion(proyecto.id, cotizacion.id, { accion })
      showToast(accion === 'aprobar' ? '✅ Cotización aprobada' : 'Cotización rechazada', accion === 'aprobar' ? 'exito' : 'alerta')
      cargar()
    } catch {
      showToast('No se pudo procesar la cotización.', 'error')
    }
  }

  if (mostrarForm) {
    return (
      <FormularioCotizacion
        proyectoId={proyecto.id}
        onCancelar={() => setMostrarForm(false)}
        onCreada={() => { setMostrarForm(false); cargar() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {puedeCrear && (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          style={{ minHeight: '48px' }}
          className="w-full rounded-xl border border-accent text-sm font-bold text-highlight transition hover:bg-accent"
        >
          + Nueva cotización
        </button>
      )}

      {loading && <p className="text-center text-sm text-text-secondary">Cargando cotizaciones…</p>}

      {!loading && cotizaciones.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">📄</span>
          <p className="text-text-secondary">Sin cotizaciones registradas todavía.</p>
        </div>
      )}

      {cotizaciones.map((c) => {
        const cfg = ESTADO_COTIZACION_CONFIG[c.estado] ?? ESTADO_COTIZACION_CONFIG.pendiente
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-text">{c.contratista_detalle?.nombre}</p>
                <p className="text-xs text-text-secondary">{c.contratista_detalle?.especialidad}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{c.descripcion_trabajo}</p>
            <p className="mt-2 font-mono text-sm font-bold text-text">{formatMoneda(c.monto)}</p>
            {c.archivo_cotizacion && (
              <a href={c.archivo_cotizacion} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-highlight hover:underline">
                📎 Ver cotización adjunta
              </a>
            )}
            <p className="mt-1 text-xs text-text-secondary">Registró: {c.created_by_detalle?.nombre} · {formatFecha(c.created_at)}</p>
            {c.aprobada_por_detalle && (
              <p className="text-xs text-text-secondary">
                {c.estado === 'aprobada' ? 'Aprobó' : 'Rechazó'}: {c.aprobada_por_detalle.nombre} · {formatFecha(c.aprobada_en)}
              </p>
            )}
            {puedeAprobar && c.estado === 'pendiente' && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => procesar(c, 'rechazar')}
                  style={{ minHeight: '44px' }}
                  className="flex-1 rounded-xl border border-error text-sm font-bold text-error transition hover:bg-error/10"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => procesar(c, 'aprobar')}
                  style={{ minHeight: '44px' }}
                  className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90"
                >
                  Aprobar
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
