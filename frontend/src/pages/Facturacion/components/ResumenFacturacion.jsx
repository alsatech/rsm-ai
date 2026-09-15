import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { generarRelacion, getResumenFacturacion } from '../../../api/facturacion'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { formatMoneda } from '../constants'

const ROLES_VISIBLES = ['administrador', 'superadmin']

function descargarBlob(url, nombreArchivo) {
  return fetch(url)
    .then((resp) => resp.blob())
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = nombreArchivo
      link.click()
      URL.revokeObjectURL(objectUrl)
    })
}

export default function ResumenFacturacion() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [resumen, setResumen] = useState(null)
  const [generando, setGenerando] = useState(false)
  const puedeVer = ROLES_VISIBLES.includes(user?.rol)
  const esSuperadmin = user?.rol === 'superadmin'

  useEffect(() => {
    if (!puedeVer) return
    getResumenFacturacion().then(({ data }) => setResumen(data)).catch(() => setResumen(null))
  }, [puedeVer])

  if (!puedeVer || !resumen) return null

  const handleGenerar = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setGenerando(true)
    try {
      const { data } = await generarRelacion(resumen.mes)
      await descargarBlob(data.archivo_excel, `Relacion_${resumen.mes}_RSM.xlsx`)
      showToast(`✅ Relación generada — ${data.numero_facturas} facturas`, 'exito')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'No se pudo generar la relación.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Link
      to="/facturacion"
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-accent"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-text">🧾 Facturación</p>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-mono text-highlight">
          {formatMoneda(resumen.total)}
        </span>
      </div>

      <div className="space-y-1 text-xs text-text-secondary">
        <p>📄 {resumen.numero_facturas} factura{resumen.numero_facturas !== 1 ? 's' : ''} este mes</p>
      </div>

      {esSuperadmin && (
        <button
          type="button"
          onClick={handleGenerar}
          disabled={generando || resumen.numero_facturas === 0}
          style={{ minHeight: '40px' }}
          className="mt-3 w-full rounded-lg border border-accent text-xs font-bold text-highlight transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generando ? 'Generando…' : '📊 Generar relación'}
        </button>
      )}
    </Link>
  )
}
