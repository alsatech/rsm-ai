import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { descargarMinutaPdf, generarMinuta, getMinutaDetalle, getMinutas } from '../../api/minuta'
import { useToast } from '../../hooks/useToast'
import DetalleDia from './components/DetalleDia'
import HistorialMinutas from './components/HistorialMinutas'
import { formatFecha, hoyISO } from './constants'

function descargarBlob(blob, nombreArchivo) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export default function Minuta() {
  const { showToast } = useToast()
  const [fecha, setFecha] = useState(hoyISO())
  const [minutas, setMinutas] = useState([])
  const [minuta, setMinuta] = useState(null)
  const [datos, setDatos] = useState(null)
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const cargarHistorial = useCallback(async () => {
    const { data } = await getMinutas()
    setMinutas(data)
  }, [])

  const cargarDetalle = useCallback(async (fechaConsulta) => {
    setLoading(true)
    try {
      const { data } = await getMinutaDetalle(fechaConsulta)
      setMinuta(data.minuta)
      setDatos(data.datos)
      setNotas(data.minuta?.notas ?? '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarHistorial() }, [cargarHistorial])
  useEffect(() => { cargarDetalle(fecha) }, [fecha, cargarDetalle])

  const handleGenerar = async () => {
    setGenerando(true)
    try {
      const { data } = await generarMinuta(fecha, notas)
      setMinuta(data)
      showToast(`✅ Minuta de ${formatFecha(fecha)} generada`, 'exito')
      cargarHistorial()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'No se pudo generar la minuta.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  const handleDescargar = async () => {
    setDescargando(true)
    try {
      const { data } = await descargarMinutaPdf(fecha)
      descargarBlob(data, `minuta_${fecha}.pdf`)
    } catch {
      showToast('No se pudo descargar el PDF.', 'error')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            to="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </Link>
          <div>
            <h1 className="font-bold text-highlight">📝 Minuta Automática</h1>
            <p className="text-xs text-text-secondary">Generación de la minuta diaria con un clic</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 py-5">
        <div>
          <label htmlFor="fecha_minuta" className="mb-1 block text-sm font-medium text-text-secondary">
            Fecha
          </label>
          <input
            id="fecha_minuta"
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
            style={{ minHeight: '48px' }}
            className="w-full rounded-lg border border-border bg-bg px-4 text-base text-text outline-none focus:border-highlight sm:w-64"
          />
        </div>

        {loading || !datos ? (
          <p className="text-center text-sm text-text-secondary">Cargando…</p>
        ) : (
          <>
            {minuta && (
              <p className="text-xs text-text-secondary">
                Última generación por {minuta.generada_por_detalle?.nombre} · {formatFecha(minuta.fecha)}
              </p>
            )}

            <DetalleDia datos={datos} />

            <div className="rounded-2xl border border-border bg-card p-5">
              <label htmlFor="notas_minuta" className="mb-2 block text-sm font-semibold text-text">
                📌 Notas de la junta
              </label>
              <textarea
                id="notas_minuta"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                placeholder="Acuerdos, seguimiento o comentarios adicionales de la junta diaria…"
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text outline-none focus:border-highlight"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleGenerar}
                disabled={generando}
                style={{ minHeight: '56px' }}
                className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generando ? 'Generando…' : minuta ? '🔁 Regenerar minuta' : '📝 Generar minuta del día'}
              </button>
              <button
                type="button"
                onClick={handleDescargar}
                disabled={descargando}
                style={{ minHeight: '56px' }}
                className="flex-1 rounded-xl border border-accent text-base font-bold text-highlight transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {descargando ? 'Descargando…' : '⬇️ Descargar PDF'}
              </button>
            </div>

            <HistorialMinutas minutas={minutas} fechaSeleccionada={fecha} onSeleccionar={setFecha} />
          </>
        )}
      </div>
    </div>
  )
}
