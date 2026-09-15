import { useCallback, useEffect, useState } from 'react'

import { deleteFactura, getFacturas } from '../../../api/facturacion'
import { useConfirm } from '../../../hooks/useConfirm'
import { useToast } from '../../../hooks/useToast'
import { MODULO_ORIGEN_ICONOS, MODULO_ORIGEN_LABELS, MODULO_ORIGEN_OPCIONES, formatFecha, formatMoneda } from '../constants'
import FormularioFactura from './FormularioFactura'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function ListaFacturas() {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState('')
  const [moduloOrigen, setModuloOrigen] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState('lista') // lista | nueva | editar
  const [facturaEditar, setFacturaEditar] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getFacturas({
        mes: mes || undefined,
        modulo_origen: moduloOrigen || undefined,
        q: busqueda || undefined,
      })
      setFacturas(data)
    } finally {
      setLoading(false)
    }
  }, [mes, moduloOrigen, busqueda])

  useEffect(() => { cargar() }, [cargar])

  const handleEliminar = async (factura) => {
    const confirmado = await confirm({
      titulo: '¿Eliminar esta factura?',
      mensaje: `${factura.folio_interno} — ${factura.concepto} (${formatMoneda(factura.importe)})`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      variante: 'peligro',
    })
    if (!confirmado) return
    try {
      await deleteFactura(factura.id)
      showToast('Factura eliminada', 'alerta')
      cargar()
    } catch {
      showToast('No se pudo eliminar la factura.', 'error')
    }
  }

  const total = facturas.reduce((acc, f) => acc + Number(f.importe), 0)

  if (vista === 'nueva' || vista === 'editar') {
    return (
      <FormularioFactura
        factura={vista === 'editar' ? facturaEditar : null}
        onCancelar={() => { setVista('lista'); setFacturaEditar(null) }}
        onGuardada={() => { setVista('lista'); setFacturaEditar(null); cargar() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setVista('nueva')}
        style={{ minHeight: '56px' }}
        className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90"
      >
        + Nueva factura
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={inputClass} />
        <select value={moduloOrigen} onChange={(e) => setModuloOrigen(e.target.value)} className={inputClass}>
          <option value="">Todos los módulos</option>
          {MODULO_ORIGEN_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por concepto o número…"
          className={inputClass}
        />
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando facturas…</p>}

      {!loading && facturas.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🧾</span>
          <p className="text-text-secondary">No hay facturas registradas para este mes — agrega la primera.</p>
        </div>
      )}

      {!loading && facturas.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Importe</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Archivo</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-3 text-text">{formatFecha(f.fecha)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">{f.numero_factura}</td>
                  <td className="px-4 py-3 text-text">{f.concepto}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-text">{formatMoneda(f.importe)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {MODULO_ORIGEN_ICONOS[f.modulo_origen] ?? '📎'} {MODULO_ORIGEN_LABELS[f.modulo_origen] ?? f.modulo_origen}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {f.archivo ? (
                      <a href={f.archivo} target="_blank" rel="noreferrer" className="text-highlight underline">Ver</a>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setFacturaEditar(f); setVista('editar') }}
                        className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:border-accent hover:text-text"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(f)}
                        className="rounded-lg border border-error/40 px-2 py-1 text-xs text-error hover:bg-error/10"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-card font-semibold text-text">
                <td className="px-4 py-3" colSpan={3}>Total</td>
                <td className="px-4 py-3 font-mono">{formatMoneda(total)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
