import { useCallback, useEffect, useRef, useState } from 'react'

import { autorizarCompraProyecto, createCompraProyecto, getComprasProyecto } from '../../../../api/proyectos'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'
import { ESTADO_COMPRA_CONFIG, MONTO_REQUIERE_AUTORIZACION, formatFecha, formatMoneda } from '../../constants'
import SelectorContratista from './SelectorContratista'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const MAX_FOTOS = 4
const ROLES_GESTIONAN = ['operaciones', 'superadmin']
const ROLES_AUTORIZAN = ['superadmin']

function FormularioCompra({ proyectoId, onCancelar, onCreada }) {
  const { showToast } = useToast()
  const [contratista, setContratista] = useState('')
  const [proveedorNombre, setProveedorNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [montoTotal, setMontoTotal] = useState('')
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  const superaLimite = montoTotal && Number(montoTotal) > MONTO_REQUIERE_AUTORIZACION
  const puedeGuardar = Boolean(descripcion.trim() && Number(montoTotal) > 0)

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setFotos((prev) => [...prev, ...files].slice(0, MAX_FOTOS))
    e.target.value = ''
  }

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      if (contratista) fd.append('contratista_proveedor', contratista)
      fd.append('proveedor_nombre', proveedorNombre)
      fd.append('descripcion', descripcion)
      fd.append('monto_total', montoTotal)
      fotos.forEach((foto) => fd.append('fotos', foto))
      const { data } = await createCompraProyecto(proyectoId, fd)
      showToast(
        data.requiere_autorizacion
          ? `⚠️ Compra ${data.folio_compra} registrada — pendiente de autorización del Licenciado`
          : `✅ Compra ${data.folio_compra} registrada`,
        data.requiere_autorizacion ? 'alerta' : 'exito',
      )
      onCreada()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo registrar la compra.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-bold text-text">Nueva compra del proyecto</h3>
      <div className="flex flex-col gap-4">
        <SelectorContratista value={contratista} onChange={setContratista} label="Proveedor del catálogo (opcional)" />
        <div>
          <label htmlFor="proveedor_nombre" className="mb-1 block text-sm font-medium text-text-secondary">
            O nombre libre del proveedor (opcional)
          </label>
          <input
            id="proveedor_nombre"
            type="text"
            value={proveedorNombre}
            onChange={(e) => setProveedorNombre(e.target.value)}
            className={inputClass}
            placeholder="Ej. Ferretería local"
          />
        </div>
        <div>
          <label htmlFor="descripcion_compra" className="mb-1 block text-sm font-medium text-text-secondary">
            Descripción *
          </label>
          <textarea
            id="descripcion_compra"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="monto_compra" className="mb-1 block text-sm font-medium text-text-secondary">
            Monto total *
          </label>
          <input
            id="monto_compra"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={montoTotal}
            onChange={(e) => setMontoTotal(e.target.value)}
            className={inputClass}
            placeholder="$0.00"
          />
          {superaLimite && (
            <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              ⚠️ Esta compra requiere autorización del Licenciado
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Fotos de evidencia/factura ({fotos.length}/{MAX_FOTOS})
          </p>
          {fotos.length < MAX_FOTOS && (
            <>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFile} />
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
          {guardando ? 'Guardando…' : '🛒 Registrar compra'}
        </button>
      </div>
    </div>
  )
}

export default function TabCompras({ proyecto }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  const puedeCrear = ROLES_GESTIONAN.includes(user?.rol)
  const puedeAutorizar = ROLES_AUTORIZAN.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getComprasProyecto(proyecto.id)
      setCompras(data)
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { cargar() }, [cargar])

  const procesar = async (compra, accion) => {
    const confirmado = await confirm({
      titulo: accion === 'autorizar' ? '¿Autorizar esta compra?' : '¿Rechazar esta compra?',
      mensaje: `${compra.folio_compra} — ${formatMoneda(compra.monto_total)}`,
      confirmText: accion === 'autorizar' ? 'Sí, autorizar' : 'Sí, rechazar',
      cancelText: 'Cancelar',
      variante: accion === 'autorizar' ? 'pregunta' : 'peligro',
    })
    if (!confirmado) return
    try {
      await autorizarCompraProyecto(proyecto.id, compra.id, { accion })
      showToast(accion === 'autorizar' ? '✅ Compra autorizada' : 'Compra rechazada', accion === 'autorizar' ? 'exito' : 'alerta')
      cargar()
    } catch {
      showToast('No se pudo procesar la compra.', 'error')
    }
  }

  if (mostrarForm) {
    return (
      <FormularioCompra
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
          + Nueva compra
        </button>
      )}

      {loading && <p className="text-center text-sm text-text-secondary">Cargando compras…</p>}

      {!loading && compras.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🛒</span>
          <p className="text-text-secondary">Sin compras registradas todavía.</p>
        </div>
      )}

      {compras.map((c) => {
        const cfg = ESTADO_COMPRA_CONFIG[c.estado] ?? ESTADO_COMPRA_CONFIG.pendiente_autorizacion
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-text-secondary">{c.folio_compra}</p>
                <p className="font-bold text-text">{c.contratista_proveedor_detalle?.nombre || c.proveedor_nombre || 'Sin proveedor'}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>{cfg.label}</span>
                {c.requiere_autorizacion && c.estado === 'pendiente_autorizacion' && (
                  <span className="animate-pulse rounded-full border border-error bg-error/20 px-2 py-0.5 text-[10px] font-bold text-error">
                    &gt; $50,000
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{c.descripcion}</p>
            <p className="mt-2 font-mono text-sm font-bold text-text">{formatMoneda(c.monto_total)}</p>
            {c.fotos?.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {c.fotos.map((f) => (
                  <img key={f.id} src={f.foto} alt="Evidencia" className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover" />
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-text-secondary">Registró: {c.created_by_detalle?.nombre} · {formatFecha(c.created_at)}</p>
            {c.autorizado_por_detalle && (
              <p className="text-xs text-text-secondary">
                {c.estado === 'autorizada' ? 'Autorizó' : 'Rechazó'}: {c.autorizado_por_detalle.nombre} · {formatFecha(c.autorizado_en)}
              </p>
            )}
            {puedeAutorizar && c.requiere_autorizacion && c.estado === 'pendiente_autorizacion' && (
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
                  onClick={() => procesar(c, 'autorizar')}
                  style={{ minHeight: '44px' }}
                  className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90"
                >
                  Autorizar
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
