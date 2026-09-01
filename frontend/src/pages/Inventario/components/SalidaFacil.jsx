import { useEffect, useState } from 'react'

import { createMovimiento, getProductos } from '../../../api/inventario'
import { getVehiculos } from '../../../api/flota'
import { useToast } from '../../../hooks/useToast'
import { SUGERENCIAS_USO, UNIDAD_LABELS, esProductoCombustible } from '../constants'
import EscanerCodigo from './EscanerCodigo'

const TIPOS_SIN_COMBUSTIBLE = new Set(['traila', 'plataforma', 'remolque'])

// Salida de material para Campo — sin selects, sin campos técnicos, una pregunta grande a la
// vez. Mismo espíritu que RecepcionFacil.jsx (Adquisiciones): pantallas grandes, botones
// enormes. Campo nunca registra entradas, así que aquí tipo siempre es 'salida'.
export default function SalidaFacil({ onVolver, onGuardado }) {
  const { showToast } = useToast()
  const [pantalla, setPantalla] = useState('producto') // producto | cantidad | destino | confirmar | listo
  const [producto, setProducto] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [cantidad, setCantidad] = useState('')
  const [vehiculos, setVehiculos] = useState([])
  const [vehiculo, setVehiculo] = useState(null)
  const [proyecto, setProyecto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const esCombustible = esProductoCombustible(producto)

  useEffect(() => {
    getVehiculos()
      .then(({ data }) => setVehiculos(data.filter((v) => !TIPOS_SIN_COMBUSTIBLE.has(v.tipo))))
      .catch(() => setVehiculos([]))
  }, [])

  useEffect(() => {
    if (pantalla !== 'producto' || busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    setBuscando(true)
    const timeout = setTimeout(() => {
      getProductos({ q: busqueda, activo: true })
        .then(({ data }) => setResultados(data.slice(0, 8)))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [busqueda, pantalla])

  const elegirProducto = (p) => {
    setProducto(p)
    setBusqueda('')
    setResultados([])
    setCantidad('')
    setVehiculo(null)
    setProyecto('')
    setPantalla('cantidad')
  }

  const handleDetectado = async (texto) => {
    setMostrarEscaner(false)
    try {
      const { data } = await getProductos({ q: texto, activo: true })
      const exacto = data.find((p) => p.codigo === texto)
      if (exacto) {
        elegirProducto(exacto)
      } else {
        showToast(`No encontramos el código "${texto}" en el catálogo.`, 'error')
      }
    } catch {
      showToast('No se pudo buscar ese código.', 'error')
    }
  }

  const cantidadNum = Number(cantidad) || 0
  const stockDisponible = Number(producto?.stock_actual) || 0
  const cantidadValida = cantidadNum > 0 && cantidadNum <= stockDisponible

  const ajustarCantidad = (delta) => {
    setCantidad((prev) => {
      const siguiente = Math.max(0, (Number(prev) || 0) + delta)
      return String(Math.min(siguiente, stockDisponible))
    })
  }

  const destinoListo = esCombustible ? Boolean(vehiculo) : proyecto.trim().length > 0

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('producto', producto.id)
      fd.append('tipo', 'salida')
      fd.append('cantidad', cantidad)
      if (esCombustible && vehiculo) fd.append('vehiculo', vehiculo)
      if (!esCombustible && proyecto.trim()) fd.append('proyecto_referencia', proyecto.trim())

      await createMovimiento(fd)
      setPantalla('listo')
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0]?.[0] || 'No se pudo registrar. Intenta otra vez.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const otraSalida = () => {
    setProducto(null)
    setCantidad('')
    setVehiculo(null)
    setProyecto('')
    setPantalla('producto')
  }

  const vehiculoSeleccionado = vehiculos.find((v) => Number(v.id) === Number(vehiculo))

  let contenido = null

  // ── Pantalla 1: ¿qué vas a sacar? ───────────────────────────────────────────
  if (pantalla === 'producto') {
    contenido = (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-5 text-center text-2xl font-bold text-text">¿Qué vas a sacar?</p>

        <button
          type="button"
          onClick={() => setMostrarEscaner(true)}
          style={{ minHeight: '96px' }}
          className="mb-5 flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-highlight text-bg shadow-xl transition active:scale-95"
        >
          <span className="text-4xl">📷</span>
          <span className="text-lg font-bold">Escanear código</span>
        </button>

        <p className="mb-2 text-center text-sm font-semibold text-text-secondary">o escríbelo</p>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Código o nombre del material…"
          style={{ minHeight: '56px' }}
          className="w-full rounded-xl border border-border bg-bg px-4 text-lg text-text outline-none focus:border-highlight"
        />
        {buscando && <p className="mt-2 text-center text-xs text-text-secondary">Buscando…</p>}

        {resultados.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => elegirProducto(p)}
                style={{ minHeight: '64px' }}
                className="rounded-xl border border-border bg-bg px-4 py-2 text-left transition hover:border-highlight active:scale-[0.99]"
              >
                <p className="font-mono text-xs text-text-secondary">{p.codigo}</p>
                <p className="text-base font-semibold text-text">{p.descripcion}</p>
              </button>
            ))}
          </div>
        )}

        {mostrarEscaner && (
          <EscanerCodigo onDetectado={handleDetectado} onCerrar={() => setMostrarEscaner(false)} />
        )}
      </div>
    )
  }

  // ── Pantalla 2: ¿cuánto vas a sacar? ────────────────────────────────────────
  if (pantalla === 'cantidad') {
    const unidad = UNIDAD_LABELS[producto.unidad_medida]
    contenido = (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 rounded-xl border border-border bg-bg p-4 text-center">
          <p className="text-xl font-bold text-text">{producto.descripcion}</p>
          <p className="mt-1 text-sm text-text-secondary">Hay {stockDisponible} {unidad} disponibles</p>
        </div>

        <p className="mb-4 text-center text-2xl font-bold text-text">¿Cuánto vas a sacar?</p>

        <div className="mb-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => ajustarCantidad(-1)}
            aria-label="Menos"
            style={{ width: '64px', height: '64px' }}
            className="flex items-center justify-center rounded-full border-2 border-border text-3xl font-bold text-text transition active:scale-90"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            style={{ minHeight: '64px', width: '140px' }}
            className="rounded-xl border-2 border-border bg-bg text-center font-mono text-3xl font-bold text-text outline-none focus:border-highlight"
          />
          <button
            type="button"
            onClick={() => ajustarCantidad(1)}
            aria-label="Más"
            style={{ width: '64px', height: '64px' }}
            className="flex items-center justify-center rounded-full border-2 border-border text-3xl font-bold text-text transition active:scale-90"
          >
            +
          </button>
        </div>
        <p className="mb-6 text-center text-sm text-text-secondary">{unidad}</p>

        {cantidadNum > stockDisponible && (
          <p className="mb-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-center text-sm font-semibold text-error">
            ⚠️ Solo hay {stockDisponible} {unidad} disponibles.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPantalla('producto')}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={() => setPantalla('destino')}
            disabled={!cantidadValida}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla 3: ¿para qué proyecto / vehículo? ──────────────────────────────
  if (pantalla === 'destino') {
    contenido = (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-5 text-center text-2xl font-bold text-text">
          {esCombustible ? '¿Para qué vehículo?' : '¿Para qué proyecto es?'}
        </p>

        {esCombustible ? (
          <div className="grid grid-cols-2 gap-3">
            {vehiculos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehiculo(v.id)}
                style={{ minHeight: '76px' }}
                className={`rounded-2xl border-2 px-3 text-center text-sm font-bold transition active:scale-95 ${
                  Number(vehiculo) === Number(v.id)
                    ? 'border-highlight bg-highlight/10 text-highlight'
                    : 'border-border text-text hover:border-accent'
                }`}
              >
                🚙 {v.nombre}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {SUGERENCIAS_USO.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => setProyecto(sugerencia)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    proyecto === sugerencia
                      ? 'border-highlight bg-highlight/10 text-highlight'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  {sugerencia}
                </button>
              ))}
            </div>
            <input
              value={proyecto}
              onChange={(e) => setProyecto(e.target.value)}
              placeholder="Ej: Cerca del potrero 4"
              style={{ minHeight: '56px' }}
              className="w-full rounded-xl border border-border bg-bg px-4 text-lg text-text outline-none focus:border-highlight"
            />
          </>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setPantalla('cantidad')}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={() => setPantalla('confirmar')}
            disabled={!destinoListo}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla 4: confirmar ───────────────────────────────────────────────────
  if (pantalla === 'confirmar') {
    contenido = (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-4 text-center text-xl font-bold text-text">¿Está bien así?</p>

        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-bg p-4 text-center">
          <p className="text-2xl font-bold text-text">{producto.descripcion}</p>
          <p className="text-lg text-text-secondary">
            {cantidad} {UNIDAD_LABELS[producto.unidad_medida]}
          </p>
          <p className="text-base text-text-secondary">
            {esCombustible ? `🚙 ${vehiculoSeleccionado?.nombre ?? ''}` : `📍 ${proyecto}`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            style={{ minHeight: '88px' }}
            className="w-full rounded-2xl bg-highlight text-xl font-bold text-bg shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : '✅ ¡Listo, sacarlo!'}
          </button>
          <button
            type="button"
            onClick={() => setPantalla('destino')}
            className="w-full py-1 text-center text-sm text-text-secondary hover:text-text"
          >
            ← Atrás
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla 5: listo ────────────────────────────────────────────────────────
  if (pantalla === 'listo') {
    contenido = (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="mb-2 text-6xl">🎉</p>
        <p className="mb-6 text-2xl font-bold text-text">¡Listo!</p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={otraSalida}
            style={{ minHeight: '76px' }}
            className="w-full rounded-2xl bg-accent text-lg font-bold text-highlight transition active:scale-95"
          >
            ➕ Sacar otro material
          </button>
          <button
            type="button"
            onClick={() => onGuardado?.()}
            style={{ minHeight: '56px' }}
            className="w-full rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            Terminar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Salir"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <h1 className="font-bold text-highlight">Sacar material</h1>
        </div>
      </header>

      <div className="px-4 py-5">{contenido}</div>
    </div>
  )
}
