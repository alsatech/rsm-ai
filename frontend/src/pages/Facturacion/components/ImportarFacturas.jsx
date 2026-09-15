import { useCallback, useEffect, useState } from 'react'

import { getImportables, importarFacturas } from '../../../api/facturacion'
import { useToast } from '../../../hooks/useToast'
import { formatFecha, formatMoneda } from '../constants'

const MODULOS = [
  { value: 'inventario', label: '📦 Inventarios' },
  { value: 'proyectos', label: '🏗️ Proyectos' },
]

export default function ImportarFacturas() {
  const { showToast } = useToast()
  const [modulo, setModulo] = useState('inventario')
  const [items, setItems] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setSeleccionados([])
    try {
      const { data } = await getImportables(modulo)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [modulo])

  useEffect(() => { cargar() }, [cargar])

  const importables = items.filter((i) => !i.ya_importada)

  const toggle = (id) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleImportar = async () => {
    if (seleccionados.length === 0) return
    setImportando(true)
    try {
      const { data } = await importarFacturas(modulo, seleccionados)
      showToast(`✅ ${data.length} factura${data.length !== 1 ? 's' : ''} importada${data.length !== 1 ? 's' : ''}`, 'exito')
      cargar()
    } catch {
      showToast('No se pudieron importar las facturas seleccionadas.', 'error')
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="modulo_importar" className="mb-1 block text-sm font-medium text-text-secondary">
          Módulo de origen
        </label>
        <select
          id="modulo_importar"
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
          style={{ minHeight: '48px' }}
          className="w-full rounded-lg border border-border bg-bg px-4 text-base text-text outline-none focus:border-highlight sm:w-64"
        >
          {MODULOS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando compras…</p>}

      {!loading && items.length === 0 && (
        <p className="mt-6 text-center text-sm text-text-secondary">Sin compras con factura adjunta en este módulo.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <label
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                item.ya_importada ? 'border-border opacity-50' : 'border-border hover:border-accent'
              }`}
            >
              <input
                type="checkbox"
                disabled={item.ya_importada}
                checked={seleccionados.includes(item.id)}
                onChange={() => toggle(item.id)}
                className="h-5 w-5 shrink-0 accent-accent"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{item.concepto}</p>
                <p className="text-xs text-text-secondary">
                  {formatFecha(item.fecha)} · {formatMoneda(item.importe)}
                </p>
              </div>
              {item.archivo_url && (
                <a
                  href={item.archivo_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-xs text-highlight underline"
                >
                  Ver factura
                </a>
              )}
              {item.ya_importada && (
                <span className="shrink-0 rounded-full border border-highlight/40 bg-highlight/10 px-2 py-1 text-[10px] font-bold text-highlight">
                  Ya importada
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {importables.length > 0 && (
        <button
          type="button"
          onClick={handleImportar}
          disabled={seleccionados.length === 0 || importando}
          style={{ minHeight: '56px' }}
          className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importando ? 'Importando…' : `⬇️ Importar seleccionadas (${seleccionados.length})`}
        </button>
      )}
    </div>
  )
}
