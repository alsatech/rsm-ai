import { useEffect, useRef, useState } from 'react'

import { actualizarCompra, getUsuarios, registrarCompra } from '../../../../api/inventario'
import { useToast } from '../../../../hooks/useToast'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROLES_COMPRAN = ['operaciones', 'inventario', 'administrador', 'superadmin']

export default function FormularioCompra({ solicitud, onCancelar, onRegistrada }) {
  const { showToast } = useToast()
  const compraExistente = solicitud.compra
  const esEdicion = Boolean(compraExistente)
  const [usuarios, setUsuarios] = useState([])
  const [compradoPor, setCompradoPor] = useState(compraExistente?.comprado_por ?? '')
  const [montoTotal, setMontoTotal] = useState(compraExistente?.monto_total ?? '')
  const [proveedor, setProveedor] = useState(compraExistente?.proveedor ?? '')
  const [notas, setNotas] = useState(compraExistente?.notas ?? '')
  const [foto, setFoto] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    getUsuarios()
      .then(({ data }) => setUsuarios(data.filter((u) => ROLES_COMPRAN.includes(u.rol))))
      .catch(() => setUsuarios([]))
  }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) setFoto(file)
    e.target.value = ''
  }

  // Al editar, la foto ya registrada cuenta como válida aunque no se suba una nueva.
  const puedeGuardar =
    Boolean(compradoPor) && Number(montoTotal) > 0 && (Boolean(foto) || (esEdicion && Boolean(compraExistente?.foto_factura)))

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('comprado_por', compradoPor)
      fd.append('monto_total', montoTotal)
      fd.append('proveedor', proveedor)
      fd.append('notas', notas)
      if (foto) fd.append('foto_factura', foto)

      if (esEdicion) {
        await actualizarCompra(solicitud.id, fd)
        showToast('✅ Compra actualizada', 'exito')
      } else {
        await registrarCompra(solicitud.id, fd)
        showToast('✅ Compra registrada — la solicitud pasó a "En compra"', 'exito')
      }
      onRegistrada?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo guardar la compra.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">
        {esEdicion ? 'Editar compra' : 'Registrar compra'} — {solicitud.folio}
      </h2>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="comprado_por" className="mb-1 block text-sm font-medium text-text-secondary">
            ¿Quién hizo la compra? *
          </label>
          <select
            id="comprado_por"
            value={compradoPor}
            onChange={(e) => setCompradoPor(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="monto_total" className="mb-1 block text-sm font-medium text-text-secondary">
            Monto total *
          </label>
          <input
            id="monto_total"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={montoTotal}
            onChange={(e) => setMontoTotal(e.target.value)}
            className={inputClass}
            placeholder="$0.00"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Foto de factura o ticket {esEdicion ? '' : '*'}
          </p>
          {!foto && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
              {esEdicion && compraExistente?.foto_factura && (
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-bg p-2">
                  <img
                    src={compraExistente.foto_factura}
                    alt="Factura actual"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <p className="text-xs text-text-secondary">Factura actual — toca "Tomar foto" para reemplazarla</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-4 text-sm font-semibold text-highlight transition hover:bg-bg"
              >
                📷 Tomar foto
              </button>
            </>
          )}
          {foto && (
            <div className="relative aspect-square w-1/2 overflow-hidden rounded-xl border border-border">
              <img src={URL.createObjectURL(foto)} alt="Factura" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFoto(null)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="proveedor" className="mb-1 block text-sm font-medium text-text-secondary">
            Proveedor (opcional)
          </label>
          <input
            id="proveedor"
            type="text"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className={inputClass}
            placeholder="Ej. Ferretería Minerva CDMX"
          />
        </div>

        <div>
          <label htmlFor="notas_compra" className="mb-1 block text-sm font-medium text-text-secondary">
            Notas (opcional)
          </label>
          <textarea
            id="notas_compra"
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
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : esEdicion ? '💾 Guardar cambios' : '💰 Registrar compra'}
        </button>
      </div>
    </div>
  )
}
