import { useState } from 'react'

import { createFactura, updateFactura } from '../../../api/facturacion'
import { useToast } from '../../../hooks/useToast'
import { MODULO_ORIGEN_OPCIONES } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function FormularioFactura({ factura, onCancelar, onGuardada }) {
  const { showToast } = useToast()
  const [fecha, setFecha] = useState(factura?.fecha ?? '')
  const [numeroFactura, setNumeroFactura] = useState(factura?.numero_factura ?? '')
  const [concepto, setConcepto] = useState(factura?.concepto ?? '')
  const [importe, setImporte] = useState(factura?.importe ?? '')
  const [moduloOrigen, setModuloOrigen] = useState(factura?.modulo_origen ?? 'otro')
  const [referenciaDescripcion, setReferenciaDescripcion] = useState(factura?.referencia_descripcion ?? '')
  const [notas, setNotas] = useState(factura?.notas ?? '')
  const [archivo, setArchivo] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const esEdicion = Boolean(factura)
  const puedeGuardar = Boolean(fecha && numeroFactura.trim() && concepto.trim() && Number(importe) > 0)

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('fecha', fecha)
      fd.append('numero_factura', numeroFactura)
      fd.append('concepto', concepto)
      fd.append('importe', importe)
      fd.append('modulo_origen', moduloOrigen)
      fd.append('referencia_descripcion', referenciaDescripcion)
      fd.append('notas', notas)
      if (archivo) fd.append('archivo', archivo)

      if (esEdicion) {
        await updateFactura(factura.id, fd)
        showToast(`✅ Factura ${factura.folio_interno} actualizada`, 'exito')
      } else {
        await createFactura(fd)
        showToast(`✅ Factura registrada — $${Number(importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'exito')
      }
      onGuardada?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo guardar la factura.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">{esEdicion ? 'Editar factura' : 'Nueva factura'}</h2>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="fecha" className="mb-1 block text-sm font-medium text-text-secondary">
            Fecha *
          </label>
          <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="numero_factura" className="mb-1 block text-sm font-medium text-text-secondary">
            Número / folio de factura *
          </label>
          <input
            id="numero_factura"
            type="text"
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            className={inputClass}
            placeholder="Ej. FGTC-3048"
          />
        </div>

        <div>
          <label htmlFor="concepto" className="mb-1 block text-sm font-medium text-text-secondary">
            Concepto / proveedor *
          </label>
          <input
            id="concepto"
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className={inputClass}
            placeholder="Ej. Combustibles de Acuña"
          />
        </div>

        <div>
          <label htmlFor="importe" className="mb-1 block text-sm font-medium text-text-secondary">
            Importe *
          </label>
          <input
            id="importe"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className={inputClass}
            placeholder="$0.00"
          />
        </div>

        <div>
          <label htmlFor="modulo_origen" className="mb-1 block text-sm font-medium text-text-secondary">
            Módulo de origen
          </label>
          <select
            id="modulo_origen"
            value={moduloOrigen}
            onChange={(e) => setModuloOrigen(e.target.value)}
            className={inputClass}
          >
            {MODULO_ORIGEN_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="referencia" className="mb-1 block text-sm font-medium text-text-secondary">
            Referencia (opcional)
          </label>
          <input
            id="referencia"
            type="text"
            value={referenciaDescripcion}
            onChange={(e) => setReferenciaDescripcion(e.target.value)}
            className={inputClass}
            placeholder='Ej. "Compra PRY2026-001", "Nómina junio 2026"'
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-text-secondary">Archivo (PDF o imagen, opcional)</p>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border file:border-accent file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-highlight"
          />
          {esEdicion && factura?.archivo && !archivo && (
            <a href={factura.archivo} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-highlight underline">
              Ver archivo actual
            </a>
          )}
        </div>

        <div>
          <label htmlFor="notas" className="mb-1 block text-sm font-medium text-text-secondary">
            Notas (opcional)
          </label>
          <textarea id="notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} className={inputClass} />
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
          {guardando ? 'Guardando…' : '🧾 Guardar factura'}
        </button>
      </div>
    </div>
  )
}
