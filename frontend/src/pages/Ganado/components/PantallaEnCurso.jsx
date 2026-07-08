import { useEffect, useRef, useState } from 'react'

import { getCorraletas, iniciarRecorrido, syncParadas } from '../../../api/ganado'
import {
  agregarParadaLocal,
  deshacerUltimaParadaLocal,
  getCorraletasCache,
  getRecorridoLocal,
  guardarCorraletasCache,
  guardarRecorridoLocal,
} from '../../../api/ganadoOffline'
import { useToast } from '../../../hooks/useToast'
import MapaRecorrido from './MapaRecorrido'

function paradasParaMapa(paradas) {
  return paradas.map((p) => ({
    orden: p.orden,
    tipo: p.corraleta_id ? 'corraleta' : 'libre',
    corraleta_id: p.corraleta_id ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    nombre: p.nombre ?? 'Punto libre',
  }))
}

function paradaParaSync({ corraleta_id, nombre_libre, lat, lng, orden, timestamp }) {
  return { corraleta_id, nombre_libre, lat, lng, orden, timestamp }
}

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function PantallaEnCurso({
  recorridoLocal,
  onUpdate,
  onVolver,
  onFinalizado,
}) {
  const { showToast } = useToast()
  const [paradas, setParadas] = useState(recorridoLocal.paradas || [])
  const [corraletas, setCorraletas] = useState(getCorraletasCache())
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [showSheet, setShowSheet] = useState(false)
  const [tabActivo, setTabActivo] = useState('corraleta')
  const [busqueda, setBusqueda] = useState('')
  const [nombreLibre, setNombreLibre] = useState('')
  const [latLibre, setLatLibre] = useState('')
  const [lngLibre, setLngLibre] = useState('')
  const [deshaciendo, setDeshaciendo] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const nombreRef = useRef(null)

  useEffect(() => {
    getCorraletas()
      .then(({ data }) => { setCorraletas(data); guardarCorraletasCache(data) })
      .catch(() => setCorraletas(getCorraletasCache()))
  }, [])

  useEffect(() => {
    const handleOnline = () => setEnLinea(true)
    const handleOffline = () => setEnLinea(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (showSheet && tabActivo === 'libre') {
      setTimeout(() => nombreRef.current?.focus(), 100)
    }
  }, [showSheet, tabActivo])

  const corraletasYaAgregadas = new Set(paradas.map((p) => p.corraleta_id).filter(Boolean))
  const corraletasFiltradas = corraletas.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  )

  const sincronizarCambio = (actualizado) => {
    setParadas(actualizado.paradas)
    onUpdate(actualizado)
  }

  const handleAgregarCorraleta = (c) => {
    if (corraletasYaAgregadas.has(c.id)) return
    agregarParadaLocal({ corraleta_id: c.id, nombre_libre: null, lat: c.lat, lng: c.lng, nombre: c.nombre })
    sincronizarCambio(getRecorridoLocal())
    setShowSheet(false)
    showToast(`✅ ${c.nombre} agregada al recorrido`, 'exito')
  }

  const handleAgregarLibre = () => {
    if (!nombreLibre.trim()) {
      showToast('Escribe el nombre del lugar.', 'error')
      return
    }
    agregarParadaLocal({
      corraleta_id: null,
      nombre_libre: nombreLibre.trim(),
      lat: latLibre || null,
      lng: lngLibre || null,
      nombre: nombreLibre.trim(),
    })
    sincronizarCambio(getRecorridoLocal())
    setNombreLibre(''); setLatLibre(''); setLngLibre('')
    setShowSheet(false)
    showToast('✅ Lugar agregado al recorrido', 'exito')
  }

  const handleDeshacer = () => {
    if (!paradas.length || deshaciendo) return
    setDeshaciendo(true)
    const restantes = deshacerUltimaParadaLocal()
    sincronizarCambio(getRecorridoLocal() ?? { ...recorridoLocal, paradas: restantes })
    showToast('Última parada eliminada', 'exito')
    setDeshaciendo(false)
  }

  const handleFinalizarClick = async () => {
    if (paradas.length === 0) return

    if (!navigator.onLine) {
      const actualizado = { ...recorridoLocal, paradas, pendiente_sync: true }
      guardarRecorridoLocal(actualizado)
      onUpdate(actualizado)
      setShowOfflineModal(true)
      return
    }

    setSincronizando(true)
    try {
      let id = recorridoLocal.id
      // Si todavía no hay recorrido en el backend (o el id guardado apunta a
      // un recorrido que ya no existe), creamos uno nuevo antes de sincronizar.
      const crearRecorrido = async () => {
        const { data } = await iniciarRecorrido({
          fecha: recorridoLocal.fecha,
          color: recorridoLocal.color,
          asistentes: recorridoLocal.asistentes,
        })
        return data.id
      }
      if (recorridoLocal.pendiente_creacion || !id) {
        id = await crearRecorrido()
      }
      try {
        await syncParadas(id, paradas.map(paradaParaSync))
      } catch (err) {
        // Si el backend dice 404, el recorrido guardado se borró o nunca
        // existió. Creamos uno nuevo y reintentamos una sola vez.
        if (err?.response?.status !== 404) throw err
        id = await crearRecorrido()
        await syncParadas(id, paradas.map(paradaParaSync))
      }
      const actualizado = {
        ...recorridoLocal,
        id,
        paradas,
        pendiente_creacion: false,
        pendiente_sync: false,
        fase: 'cerrando',
      }
      guardarRecorridoLocal(actualizado)
      onFinalizado(actualizado)
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      const msg = status === 404
        ? 'No se pudo crear el recorrido en el servidor.'
        : detail || 'No se pudo sincronizar. Intenta de nuevo.'
      showToast(msg, 'error')
    } finally {
      setSincronizando(false)
    }
  }

  const paradasOrdenadas = [...paradas].sort((a, b) => a.orden - b.orden)
  const mapaParadas = paradasParaMapa(paradasOrdenadas)

  return (
    <div className="min-h-svh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-xl text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-highlight" />
              </span>
              <span className="text-lg font-bold text-highlight">
                En recorrido{recorridoLocal.iniciado_en ? ` desde ${formatHora(recorridoLocal.iniciado_en)}` : ''}
              </span>
            </div>
            <span className={`text-xs font-semibold ${enLinea ? 'text-highlight' : 'text-warning'}`}>
              {enLinea ? '📶 Con señal' : '📵 Sin señal — guardando local'}
            </span>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-highlight">
            {paradas.length} parada{paradas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Mapa */}
        <MapaRecorrido
          corraletas={corraletas}
          paradas={mapaParadas}
          color={recorridoLocal.color}
          height="33svh"
        />

        {/* Ruta actual */}
        {paradasOrdenadas.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">
              📍 Ruta actual
            </p>
            <div className="space-y-2">
              {paradasOrdenadas.map((p) => {
                const esLibre = !p.corraleta_id
                return (
                  <div key={`${p.orden}-${p.nombre}`} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-highlight text-sm font-bold text-bg">
                      {p.orden}
                    </span>
                    <span className="flex-1 text-base font-semibold text-text">{p.nombre}</span>
                    {p.timestamp && (
                      <span className="font-mono text-xs text-text-secondary">{formatHora(p.timestamp)}</span>
                    )}
                    {esLibre && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-highlight">
                        libre
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center">
            <p className="text-lg text-text-secondary">Sin paradas todavía</p>
            <p className="mt-1 text-sm text-text-secondary opacity-60">
              Presiona el botón verde para agregar la primera
            </p>
          </div>
        )}
      </div>

      {/* Botones fijos */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-4 space-y-3">
        {/* Agregar parada - botón principal grande */}
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-highlight py-5 text-xl font-bold text-bg transition hover:opacity-90"
        >
          <span className="text-2xl">📍</span> Agregar parada
        </button>

        <div className="flex gap-3">
          {paradas.length > 0 && (
            <button
              type="button"
              onClick={handleDeshacer}
              disabled={deshaciendo}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-base font-bold text-text-secondary transition hover:border-accent disabled:opacity-40"
            >
              ↩ Deshacer
            </button>
          )}
          <button
            type="button"
            onClick={handleFinalizarClick}
            disabled={paradas.length === 0 || sincronizando}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-highlight py-4 text-base font-bold text-highlight transition hover:bg-accent disabled:opacity-30"
          >
            {sincronizando ? 'Sincronizando...' : 'Finalizar recorrido ✅'}
          </button>
        </div>
      </div>
      <div className="h-44" />

      {/* Sheet: Agregar parada */}
      {showSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={() => setShowSheet(false)}
          />
          <div className="relative z-50 rounded-t-3xl border-t border-border bg-card px-4 pt-5 pb-10">
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />

            <div className="mb-5 flex items-center justify-between">
              <p className="text-xl font-bold text-text">¿A dónde van?</p>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg text-text-secondary"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-5 flex rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setTabActivo('corraleta')}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-base font-bold transition ${
                  tabActivo === 'corraleta'
                    ? 'bg-highlight text-bg'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                🏠 Corraleta
              </button>
              <button
                type="button"
                onClick={() => setTabActivo('libre')}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-base font-bold transition ${
                  tabActivo === 'libre'
                    ? 'bg-highlight text-bg'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                📌 Otro lugar
              </button>
            </div>

            {/* Tab: Catálogo */}
            {tabActivo === 'corraleta' && (
              <div>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar corraleta..."
                  className="mb-3 w-full rounded-xl border-2 border-border bg-bg px-4 py-3 text-base text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
                />
                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
                  {corraletasFiltradas.map((c) => {
                    const yaEsta = corraletasYaAgregadas.has(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAgregarCorraleta(c)}
                        disabled={yaEsta}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition ${
                          yaEsta
                            ? 'border-highlight bg-accent cursor-default'
                            : 'border-border hover:border-highlight hover:bg-card'
                        } disabled:opacity-60`}
                      >
                        <span className="text-lg">{yaEsta ? '✅' : '🏠'}</span>
                        <span className={`text-sm font-semibold ${yaEsta ? 'text-highlight' : 'text-text'}`}>
                          {c.nombre}
                        </span>
                      </button>
                    )
                  })}
                  {corraletasFiltradas.length === 0 && (
                    <p className="col-span-2 py-4 text-center text-sm text-text-secondary">
                      Sin resultados.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Lugar libre */}
            {tabActivo === 'libre' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-text-secondary">
                    📝 ¿Cómo se llama este lugar?
                  </label>
                  <input
                    ref={nombreRef}
                    type="text"
                    value={nombreLibre}
                    onChange={(e) => setNombreLibre(e.target.value)}
                    placeholder="Ej: La lomita del aguaje"
                    className="w-full rounded-xl border-2 border-border bg-bg px-4 py-3 text-base text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-text-secondary">
                    🗺️ Coordenadas <span className="font-normal">(opcional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={latLibre}
                      onChange={(e) => setLatLibre(e.target.value)}
                      placeholder="Latitud"
                      step="0.0000001"
                      className="flex-1 rounded-xl border-2 border-border bg-bg px-3 py-3 text-sm text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
                    />
                    <input
                      type="number"
                      value={lngLibre}
                      onChange={(e) => setLngLibre(e.target.value)}
                      placeholder="Longitud"
                      step="0.0000001"
                      className="flex-1 rounded-xl border-2 border-border bg-bg px-3 py-3 text-sm text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAgregarLibre}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-lg font-bold text-bg"
                >
                  📌 Agregar punto
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal sin señal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 px-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-warning bg-card p-6 text-center">
            <p className="mb-2 text-4xl">📵</p>
            <p className="mb-2 text-lg font-bold text-warning">Sin conexión</p>
            <p className="mb-6 text-sm text-text-secondary">
              Tu recorrido está guardado en este dispositivo. Se enviará automáticamente
              cuando tengas señal.
            </p>
            <button
              type="button"
              onClick={() => { setShowOfflineModal(false); onVolver() }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-base font-bold text-bg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
