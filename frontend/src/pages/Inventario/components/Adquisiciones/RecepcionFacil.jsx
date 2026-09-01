import { useRef, useState } from 'react'

import { crearRecepcion } from '../../../../api/inventario'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/useToast'
import GrabadorAudio from './GrabadorAudio'

const MAX_FOTOS = 4

// Recepción de material para Campo — pensada para alguien que nunca usó una app.
// Una sola pregunta grande a la vez, sin números que llenar salvo que algo salga mal,
// y sin la lista completa de decisiones en una sola pantalla larga.
//
// Camino feliz (todo llegó bien): 1 pregunta → foto → listo. 3 toques.
// Camino con problemas: 1 pregunta → un material a la vez → foto → listo.
export default function RecepcionFacil({ solicitud, onCancelar, onRecibido }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const itemsEnviados = solicitud.items.filter((item) => Number(item.cantidad_enviada) > 0)

  const [pantalla, setPantalla] = useState('pregunta') // pregunta | items | final
  const [itemIndex, setItemIndex] = useState(0)
  const [checks, setChecks] = useState(() =>
    Object.fromEntries(
      itemsEnviados.map((item) => [
        item.id,
        { cantidad_recibida: item.cantidad_enviada, estado_item: null, notas: '', foto: null },
      ])
    )
  )
  const [fotosLlegada, setFotosLlegada] = useState([])
  const [audio, setAudio] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const inputFotoRef = useRef(null)

  const actualizarCheck = (itemId, campo, valor) => {
    setChecks((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [campo]: valor } }))
  }

  const marcarTodoBien = () => {
    setChecks((prev) => {
      const copia = { ...prev }
      itemsEnviados.forEach((item) => {
        copia[item.id] = { ...copia[item.id], estado_item: 'ok', cantidad_recibida: item.cantidad_enviada }
      })
      return copia
    })
    setPantalla('final')
  }

  const irARevisarItems = () => {
    setItemIndex(0)
    setPantalla('items')
  }

  const elegirEstadoItem = (item, estado) => {
    if (estado === 'faltante') {
      actualizarCheck(item.id, 'estado_item', estado)
      actualizarCheck(item.id, 'cantidad_recibida', 0)
    } else if (estado === 'ok') {
      actualizarCheck(item.id, 'estado_item', estado)
      actualizarCheck(item.id, 'cantidad_recibida', item.cantidad_enviada)
    } else {
      actualizarCheck(item.id, 'estado_item', estado)
    }
  }

  const siguienteItem = () => {
    if (itemIndex < itemsEnviados.length - 1) {
      setItemIndex((i) => i + 1)
    } else {
      setPantalla('final')
    }
  }

  const anteriorItem = () => {
    if (itemIndex > 0) setItemIndex((i) => i - 1)
    else setPantalla('pregunta')
  }

  const derivarEstadoGeneral = () => {
    const estados = itemsEnviados.map((item) => checks[item.id].estado_item)
    if (estados.every((e) => e === 'ok')) return 'completo'
    if (estados.some((e) => e === 'daniado')) return 'con_danios'
    return 'parcial'
  }

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setFotosLlegada((prev) => [...prev, ...files].slice(0, MAX_FOTOS))
    e.target.value = ''
  }

  const puedeGuardar = fotosLlegada.length >= 1

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('estado_general', derivarEstadoGeneral())
      const items = itemsEnviados.map((item) => ({
        item_solicitud: item.id,
        cantidad_recibida: checks[item.id].cantidad_recibida,
        estado_item: checks[item.id].estado_item,
        notas: checks[item.id].notas,
      }))
      fd.append('items', JSON.stringify(items))
      itemsEnviados.forEach((item) => {
        const foto = checks[item.id].foto
        if (foto) fd.append(`foto_item_${item.id}`, foto)
      })
      fotosLlegada.forEach((foto) => fd.append('fotos_llegada', foto))
      if (audio) fd.append('audio', audio)

      await crearRecepcion(solicitud.id, fd)
      showToast('✅ ¡Listo! Recepción guardada', 'exito')
      onRecibido?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo guardar. Intenta otra vez.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  // ── Pantalla 1: la pregunta grande ──────────────────────────────────────────
  if (pantalla === 'pregunta') {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-center text-xl font-bold text-text">{solicitud.folio}</h2>
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-highlight/40 bg-highlight/10 px-4 py-3">
          <span className="text-xl">✅</span>
          <p className="text-sm font-bold text-highlight">
            Tú lo estás recibiendo — {user?.nombre || user?.username}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-bg p-4">
          <p className="mb-1 text-sm font-semibold text-text-secondary">Esto es lo que debe llegar:</p>
          {itemsEnviados.map((item) => (
            <p key={item.id} className="text-base text-text">
              📦 {item.producto_detalle?.descripcion || item.descripcion_libre}
              <span className="text-text-secondary"> — {item.cantidad_enviada} {item.unidad}</span>
            </p>
          ))}
        </div>

        <p className="mb-4 text-center text-2xl font-bold text-text">¿Llegó todo bien?</p>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={marcarTodoBien}
            style={{ minHeight: '96px' }}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-highlight text-bg shadow-xl transition active:scale-95"
          >
            <span className="text-4xl">😃</span>
            <span className="text-lg font-bold">Sí, llegó todo bien</span>
          </button>

          <button
            type="button"
            onClick={irARevisarItems}
            style={{ minHeight: '96px' }}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-warning bg-warning/10 text-warning shadow-xl transition active:scale-95"
          >
            <span className="text-4xl">😕</span>
            <span className="text-lg font-bold">No, algo faltó o se rompió</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onCancelar}
          className="mt-6 w-full py-1 text-center text-sm text-text-secondary hover:text-text"
        >
          ← Regresar
        </button>
      </div>
    )
  }

  // ── Pantalla 2: un material a la vez ────────────────────────────────────────
  if (pantalla === 'items') {
    const item = itemsEnviados[itemIndex]
    const check = checks[item.id]

    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-center text-sm font-semibold text-text-secondary">
          Material {itemIndex + 1} de {itemsEnviados.length}
        </p>
        <div className="mb-4 flex justify-center gap-1.5">
          {itemsEnviados.map((it, i) => (
            <span
              key={it.id}
              className={`h-2 w-2 rounded-full ${i === itemIndex ? 'bg-highlight' : 'bg-border'}`}
            />
          ))}
        </div>

        <div className="mb-5 rounded-xl border border-border bg-bg p-4 text-center">
          <p className="text-2xl font-bold text-text">
            {item.producto_detalle?.descripcion || item.descripcion_libre}
          </p>
          <p className="mt-1 text-base text-text-secondary">
            Se mandaron: {item.cantidad_enviada} {item.unidad}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => elegirEstadoItem(item, 'ok')}
            style={{ minHeight: '76px' }}
            className={`flex items-center justify-center gap-3 rounded-2xl border-2 text-lg font-bold transition active:scale-95 ${
              check.estado_item === 'ok'
                ? 'border-highlight bg-highlight text-bg'
                : 'border-border text-text hover:border-highlight'
            }`}
          >
            <span className="text-3xl">✅</span> Llegó completo
          </button>
          <button
            type="button"
            onClick={() => elegirEstadoItem(item, 'daniado')}
            style={{ minHeight: '76px' }}
            className={`flex items-center justify-center gap-3 rounded-2xl border-2 text-lg font-bold transition active:scale-95 ${
              check.estado_item === 'daniado'
                ? 'border-[#f97316] bg-[#f97316] text-bg'
                : 'border-border text-text hover:border-[#f97316]'
            }`}
          >
            <span className="text-3xl">⚠️</span> Llegó incompleto o dañado
          </button>
          <button
            type="button"
            onClick={() => elegirEstadoItem(item, 'faltante')}
            style={{ minHeight: '76px' }}
            className={`flex items-center justify-center gap-3 rounded-2xl border-2 text-lg font-bold transition active:scale-95 ${
              check.estado_item === 'faltante'
                ? 'border-error bg-error text-white'
                : 'border-border text-text hover:border-error'
            }`}
          >
            <span className="text-3xl">❌</span> No llegó nada
          </button>
        </div>

        {check.estado_item === 'daniado' && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#f97316]/40 bg-[#f97316]/10 p-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">¿Cuánto llegó?</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={check.cantidad_recibida}
                onChange={(e) => actualizarCheck(item.id, 'cantidad_recibida', e.target.value)}
                style={{ minHeight: '56px' }}
                className="w-full rounded-lg border border-border bg-bg px-4 text-lg text-text outline-none focus:border-highlight"
              />
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-semibold text-text-secondary hover:border-highlight">
              📷 {check.foto ? check.foto.name : 'Toma una foto de lo que llegó mal'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => actualizarCheck(item.id, 'foto', e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={anteriorItem}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={siguienteItem}
            disabled={!check.estado_item}
            style={{ minHeight: '56px' }}
            className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {itemIndex < itemsEnviados.length - 1 ? 'Siguiente →' : 'Terminar →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla 3: foto, audio y confirmar ─────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-1 text-center text-4xl">📸</p>
      <p className="mb-5 text-center text-xl font-bold text-text">Toma una foto de cómo llegó</p>

      <div className="flex flex-col gap-4">
        <div>
          {fotosLlegada.length < MAX_FOTOS && (
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              style={{ minHeight: '90px' }}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent text-lg font-bold text-highlight transition hover:bg-bg active:scale-95"
            >
              📷 Tomar foto
            </button>
          )}
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          {fotosLlegada.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fotosLlegada.map((foto, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={URL.createObjectURL(foto)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotosLlegada((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg/80 text-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-center text-sm font-semibold text-text-secondary">
            🎙️ ¿Quieres contar algo? (opcional)
          </p>
          {audio ? (
            <div className="flex items-center gap-3 rounded-xl border border-highlight/40 bg-highlight/10 p-3">
              <audio controls src={URL.createObjectURL(audio)} className="h-10 flex-1" />
              <button
                type="button"
                onClick={() => setAudio(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-error"
              >
                ✕
              </button>
            </div>
          ) : (
            <GrabadorAudio onAudioListo={(archivo) => setAudio(archivo)} />
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
          style={{ minHeight: '80px' }}
          className="w-full rounded-2xl bg-highlight text-xl font-bold text-bg shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : '✅ ¡Listo!'}
        </button>
        <button
          type="button"
          onClick={() => setPantalla(itemsEnviados.length > 0 && itemsEnviados.some((it) => checks[it.id].estado_item) ? 'items' : 'pregunta')}
          className="w-full py-1 text-center text-sm text-text-secondary hover:text-text"
        >
          ← Atrás
        </button>
      </div>
    </div>
  )
}
