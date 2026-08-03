import { useEffect, useRef, useState } from 'react'

import { getVehiculos } from '../../../api/flota'
import {
  CARGA_TRAILA_ITEM,
  ESTADO_FISICO_LADOS,
  INCIDENCIA_NUEVA_ITEM,
  INCIDENCIA_PREVIA_ITEM,
  MODELO_TRAILA_PERMITIDO,
  TABLERO_ITEM,
  TRAILA_ITEMS,
  esOffRoad,
  esTraila,
  sinKilometraje,
} from '../constants'
import AudiosChecklist from './AudiosChecklist'
import GrabadorAudio from './GrabadorAudio'

function IconoSeccion({ icono }) {
  return (
    <span className="glass-card flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl">
      {icono}
    </span>
  )
}

const MAX_FOTOS_GENERALES = 6

// Subidor masivo: un solo botón para subir todas las fotos del checklist. Cada foto se asigna
// automáticamente a la siguiente casilla pendiente (en orden). Las fotos que sobran (sin
// slot) se guardan como "evidencia adicional" y se muestran al final en la galería.
function SubidorMasivo({ slots, fotos, onAgregarFoto, onEliminarFoto, inputRefExterno }) {
  const inputRefLocal = useRef(null)
  const inputRef = inputRefExterno ?? inputRefLocal

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const pendientes = slots.filter((s) => !fotos.some((f) => f.item === s.item))
    files.forEach((file, i) => {
      const slot = pendientes[i]
      onAgregarFoto(slot ? slot.item : '', file)
    })
    e.target.value = ''
  }

  const completados = slots.filter((s) => fotos.some((f) => f.item === s.item)).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconoSeccion icono="📷" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-flotafg">Evidencia fotográfica</h2>
          <p className="text-xs text-flotafg-muted">Toma varias fotos o elige varias de tu galería</p>
        </div>
        <span className="font-mono text-sm font-bold text-flotafg-muted">{completados}/{slots.length}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{ minHeight: '64px' }}
        className="glass-card flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-highlight/70 bg-highlight/5 text-base font-bold text-flotafg transition hover:-translate-y-0.5 hover:border-highlight hover:bg-highlight/10 hover:shadow-md active:scale-[0.98]"
      >
        📷 Tomar o elegir fotos
      </button>
      <p className="text-xs text-flotafg-muted">
        Las fotos se asignan solas a las casillas pendientes, en orden.
      </p>

      <div className="glass-card flex flex-col divide-y divide-flotafg-muted/15 overflow-hidden rounded-xl">
        {slots.map((slot) => {
          const indexFoto = fotos.findIndex((f) => f.item === slot.item)
          const listo = indexFoto >= 0
          return (
            <button
              key={slot.item}
              type="button"
              onClick={() => listo && onEliminarFoto(indexFoto)}
              style={{ minHeight: '52px' }}
              className={`flex items-center gap-3 px-4 text-left transition ${listo ? 'bg-highlight/15' : 'hover:bg-flotacard/50'}`}
            >
              <span className="text-xl">{slot.icon}</span>
              <span className={`flex-1 text-sm font-semibold ${listo ? 'text-flotafg' : 'text-flotafg-muted'}`}>
                {slot.label}
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                  listo ? 'border-highlight bg-highlight text-white' : 'border-flotafg-muted/40'
                }`}
              >
                {listo ? '✓' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Selector Sí/No para "¿Hubo alguna incidencia?". En salida = preexistente, en llegada = nueva.
function SelectorIncidencia({ tipoReporte, value, onChange }) {
  const esSalida = tipoReporte === 'salida'
  const titulo = esSalida ? '¿El vehículo ya tenía daños visibles?' : '¿Hubo alguna incidencia durante el uso?'
  const ayuda = esSalida
    ? 'Si trae golpes, rayones o piezas rotas, repórtalo aquí para deslindarte.'
    : 'Si tuviste algún choque, ponchadura o rotura, repórtalo aquí.'
  const icono = esSalida ? '⚠️' : '🚨'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconoSeccion icono={icono} />
        <div>
          <h2 className="text-lg font-bold text-flotafg">{titulo}</h2>
          <p className="text-xs text-flotafg-muted">{ayuda}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{ minHeight: '56px' }}
          className={`rounded-xl border-2 text-base font-bold transition active:scale-[0.98] ${
            value === true
              ? 'flota-cta-primary border-transparent'
              : 'glass-card border-flotafg-muted/30 text-flotafg-muted hover:border-error hover:text-error'
          }`}
        >
          🚨 Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{ minHeight: '56px' }}
          className={`rounded-xl border-2 text-base font-bold transition active:scale-[0.98] ${
            value === false
              ? 'border-highlight bg-highlight/20 text-accent'
              : 'glass-card border-flotafg-muted/30 text-flotafg-muted hover:border-highlight hover:text-highlight'
          }`}
        >
          ✓ No
        </button>
      </div>
    </div>
  )
}

// Cuando el usuario responde Sí, aparece un panel con: textarea (descripción) + subida
// obligatoria de foto + galería de TODAS las fotos que lleva el checklist.
function DetalleIncidencia({
  tipoReporte,
  texto,
  onTexto,
  itemIncidencia,
  fotos,
  onAgregarFoto,
  onEliminarFoto,
  inputRefIncidencia,
}) {
  const esSalida = tipoReporte === 'salida'
  const placeholder = esSalida
    ? 'Ej. Espejo derecho ya traía el cristal roto cuando lo saqué…'
    : 'Ej. Choqué contra el portón del corral, se rompió la defensa delantera…'
  const config = esSalida ? INCIDENCIA_PREVIA_ITEM : INCIDENCIA_NUEVA_ITEM
  const titulo = esSalida ? 'Daño preexistente' : 'Daño nuevo / choque'
  const faltaFoto = texto.trim() && !fotos.some((f) => f.item === itemIncidencia)
  const fotosPorItem = fotos.filter((f) => f.item === itemIncidencia)

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl border-2 border-error/40 bg-error/10 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{config.icon}</span>
        <h3 className="text-base font-bold text-flotafg">{titulo}</h3>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted" htmlFor="incidencia_texto">
          Describe el daño
        </label>
        <textarea
          id="incidencia_texto"
          rows={3}
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 bg-flotacard/60 px-4 py-3 text-base text-flotafg outline-none transition ${
            faltaFoto ? 'border-error/60 focus:border-error' : 'border-flotafg-muted/30 focus:border-highlight'
          }`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Foto de evidencia</p>
        {fotosPorItem.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRefIncidencia.current?.click()}
            style={{ minHeight: '64px' }}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-error bg-flotacard/50 text-base font-bold text-flotafg transition hover:bg-error/5 active:scale-[0.98]"
          >
            📷 Subir foto del {esSalida ? 'daño preexistente' : 'daño'}
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {fotosPorItem.map((foto) => {
              const idx = fotos.findIndex((f) => f === foto)
              return (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border-2 border-error/40">
                  <img src={foto.preview} alt="Incidencia" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onEliminarFoto(idx)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-flotacard/80 text-error hover:bg-flotacard"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => inputRefIncidencia.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-error/50 bg-flotacard/50 text-2xl text-flotafg-muted hover:border-error"
            >
              +
            </button>
          </div>
        )}
        {faltaFoto && (
          <p className="text-xs font-semibold text-error">
            ⚠️ Sube al menos una foto del daño para poder guardar el checklist.
          </p>
        )}
      </div>
    </div>
  )
}

// Galería de TODAS las fotos cargadas (ítems del checklist + adicionales + incidencia).
function GaleriaTodasLasFotos({ fotos, onEliminarFoto }) {
  if (!fotos.length) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconoSeccion icono="🖼️" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-flotafg">Fotos cargadas</h2>
          <p className="text-xs text-flotafg-muted">Toca la ✕ para eliminar una foto</p>
        </div>
        <span className="font-mono text-sm font-bold text-flotafg-muted">{fotos.length}</span>
      </div>
      <div className="glass-card grid grid-cols-3 gap-2 rounded-2xl p-2 sm:grid-cols-4">
        {fotos.map((foto, i) => {
          const idx = fotos.findIndex((f) => f === foto)
          return (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-flotafg-muted/20">
              <img src={foto.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onEliminarFoto(idx)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-flotacard/80 text-xs text-error hover:bg-flotacard"
              >
                ✕
              </button>
              {foto.item && (
                <span className="absolute bottom-1.5 left-1.5 rounded bg-flotacard/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-highlight">
                  {foto.item}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Paso2Inspeccion({
  form,
  setForm,
  tipoVehiculo,
  kilometrajeActual,
  fotos,
  onAgregarFoto,
  onEliminarFoto,
  huboIncidencia,
  onHuboIncidencia,
  itemIncidencia,
  textoIncidencia,
  hayFotoIncidencia,
  audios,
  onAgregarAudio,
  onEliminarAudio,
  guardando,
  onGuardar,
}) {
  const [trailas, setTrailas] = useState([])
  const inputRefIncidencia = useRef(null)

  const offRoad = esOffRoad(tipoVehiculo)
  const esTrailaVehiculo = esTraila(tipoVehiculo)
  const kilometrajeAplica = !sinKilometraje(tipoVehiculo)

  useEffect(() => {
    if (!offRoad) return
    getVehiculos()
      .then(({ data }) => setTrailas(
        data.filter((v) => v.tipo === 'traila' && v.modelo === MODELO_TRAILA_PERMITIDO)
      ))
      .catch(() => setTrailas([]))
  }, [offRoad])

  const esSalida = form.tipo_reporte === 'salida'

  // Slots del checklist (en orden). Si el usuario responde Sí en la incidencia,
  // agregamos una casilla para su foto también.
  // Llegadas: 1 sola foto del tablero (km+gasolina) y NO se exige evidencia de neumáticos.
  // Salidas: mantiene kilometraje y gasolina como slots separados (compatibilidad con
  // fotos históricas) y exige evidencia de neumáticos.
  const slots = (() => {
    const list = []
    if (esTrailaVehiculo) {
      TRAILA_ITEMS.forEach((item) => list.push({ item: item.key, icon: item.icon, label: item.label }))
      return list
    }
    if (esSalida) {
      if (kilometrajeAplica) {
        list.push({
          item: 'kilometraje',
          icon: '🔢',
          label: offRoad ? 'Horas actuales (foto del tablero)' : 'Kilometraje actual (foto del tablero)',
        })
      }
      list.push({ item: 'gasolina', icon: '⛽', label: 'Gasolina (foto del tablero)' })
    } else {
      // Llegada — una sola foto del tablero cubre kilometraje + gasolina.
      list.push({
        item: TABLERO_ITEM.key,
        icon: TABLERO_ITEM.icon,
        label: offRoad
          ? 'Horas + gasolina (foto del tablero)'
          : 'Kilometraje + gasolina (foto del tablero)',
      })
    }
    ESTADO_FISICO_LADOS.forEach((lado) => {
      list.push({ item: lado.key, icon: '📷', label: `Costado ${lado.label.toLowerCase()}` })
    })
    list.push({ item: 'estado_fisico_interior', icon: '📷', label: 'Interior (opcional)' })
    // Llantas / neumáticos — solo se piden al sacar el vehículo. Al llegar ya no se exige.
    if (esSalida) {
      list.push({ item: 'presion_llantas', icon: '🛞', label: 'Llantas / neumáticos (foto si alguna está baja)' })
    }
    if (esSalida) {
      list.push({ item: 'nivel_aceite_motor', icon: '🛢️', label: 'Nivel de aceite motor' })
      list.push({ item: 'anticongelante', icon: '🧊', label: 'Anticongelante' })
      if (offRoad) {
        list.push({ item: 'soplado_filtro_aire', icon: '💨', label: 'Sopleteo del filtro de aire' })
      } else {
        list.push({ item: 'nivel_aceite_transmision', icon: '⚙️', label: 'Nivel de aceite transmisión' })
      }
    } else {
      list.push({ item: 'lavado', icon: '🧼', label: 'Lavado del vehículo' })
    }
    if (offRoad && form.traila) {
      list.push({ item: 'carga_traila', icon: CARGA_TRAILA_ITEM.icon, label: CARGA_TRAILA_ITEM.label })
    }
    if (huboIncidencia === true) {
      list.push({
        item: itemIncidencia,
        icon: esSalida ? INCIDENCIA_PREVIA_ITEM.icon : INCIDENCIA_NUEVA_ITEM.icon,
        label: esSalida ? 'Foto del daño preexistente' : 'Foto del daño / choque',
      })
    }
    return list
  })()

  const handleArchivosIncidencia = (e) => {
    const files = Array.from(e.target.files)
    files.forEach((file) => onAgregarFoto(itemIncidencia, file))
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Kilometraje — informativo, la fuente de la verdad es la foto del tablero */}
      {kilometrajeAplica && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconoSeccion icono="🔢" />
            <div>
              <h2 className="text-lg font-bold text-flotafg">
                {offRoad ? 'Horas actuales' : 'Kilometraje actual'}
              </h2>
              <p className="text-xs text-flotafg-muted">Referencia informativa — la fuente de la verdad es la foto</p>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <input
              id="km_reporte"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={kilometrajeActual ?? undefined}
              value={form.km_reporte}
              onChange={(e) => setForm((prev) => ({ ...prev, km_reporte: e.target.value }))}
              style={{ minHeight: '64px' }}
              className="glass-card w-full rounded-xl border-2 border-flotafg-muted/30 px-4 text-3xl font-bold text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
              placeholder="Opcional"
            />
            <span
              style={{ minHeight: '64px' }}
              className="glass-card flex w-20 shrink-0 items-center justify-center rounded-xl text-base font-bold text-flotafg-muted"
            >
              {offRoad ? 'hrs' : 'km'}
            </span>
          </div>
          {kilometrajeActual != null && (
            <p className="text-xs text-flotafg-muted">
              Último registrado: {kilometrajeActual.toLocaleString('es-MX')} {offRoad ? 'hrs' : 'km'}
            </p>
          )}
        </div>
      )}

      {/* Selector de traila (solo vehículos off-road) */}
      {offRoad && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconoSeccion icono="🚚" />
            <div>
              <h2 className="text-lg font-bold text-flotafg">Carga de la traila</h2>
              <p className="text-xs text-flotafg-muted">Elige cuál traila vas a jalar</p>
            </div>
          </div>
          <select
            value={form.traila ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, traila: e.target.value ? Number(e.target.value) : null }))}
            style={{ minHeight: '56px' }}
            className="glass-card w-full rounded-xl px-3 text-sm text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
          >
            <option value="" disabled>Selecciona la traila</option>
            {trailas.map((t) => (
              <option key={t.id} value={t.id}>{t.equipo || t.nombre}</option>
            ))}
          </select>
          <p className="text-xs text-flotafg-muted">
            Solo se pueden jalar trailas de {MODELO_TRAILA_PERMITIDO}.
          </p>
        </div>
      )}

      {/* Carga masiva de evidencia fotográfica */}
      <SubidorMasivo slots={slots} fotos={fotos} onAgregarFoto={onAgregarFoto} onEliminarFoto={onEliminarFoto} />

      {/* Pregunta Sí/No sobre incidencias */}
      <SelectorIncidencia
        tipoReporte={form.tipo_reporte}
        value={huboIncidencia}
        onChange={onHuboIncidencia}
      />

      {/* Si la respuesta es Sí, aparece el panel con descripción + foto */}
      {huboIncidencia === true && (
        <>
          <input
            ref={inputRefIncidencia}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleArchivosIncidencia}
          />
          <DetalleIncidencia
            tipoReporte={form.tipo_reporte}
            texto={textoIncidencia}
            onTexto={(t) => setForm((prev) => ({ ...prev, [itemIncidencia]: t }))}
            itemIncidencia={itemIncidencia}
            fotos={fotos}
            onAgregarFoto={onAgregarFoto}
            onEliminarFoto={onEliminarFoto}
            inputRefIncidencia={inputRefIncidencia}
          />
        </>
      )}

      {/* Observaciones + audio estilo WhatsApp */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <IconoSeccion icono="📝" />
          <div>
            <h2 className="text-lg font-bold text-flotafg">Observaciones</h2>
            <p className="text-xs text-flotafg-muted">Opcional — escríbelas o mándalas como audio</p>
          </div>
        </div>

        {/* Instrucción clara: cómo mandar el audio */}
        <div className="flex items-start gap-2 rounded-xl border-2 border-dashed border-error/40 bg-error/5 px-3 py-2 text-xs text-flotafg">
          <span className="text-base leading-none">🎙️</span>
          <p className="leading-snug">
            <span className="font-bold">¿Quieres mandar un audio?</span>{' '}
            Mantén presionado el botón rojo del micrófono
            <span className="mx-1 font-bold text-error">🎙️</span>
            abajo, habla y suelta para enviar. Si quieres cancelar, desliza el dedo hacia abajo antes de soltar.
          </p>
        </div>

        <textarea
          rows={2}
          value={form.observaciones}
          onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
          className="glass-card w-full rounded-xl border-2 border-flotafg-muted/30 px-4 py-3 text-base text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
          placeholder="Notas generales del checklist…"
        />

        {/* Botón push-to-talk + lista de audios ya capturados */}
        <div className="glass-card flex items-center gap-4 rounded-2xl px-4 py-3">
          <GrabadorAudio
            onAudioListo={(file, duracion) => onAgregarAudio?.(file, duracion)}
            disabled={guardando}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-flotafg">Mandar audio</p>
            <p className="text-xs text-flotafg-muted">
              Estilo WhatsApp —{'>'} mantén presionado para grabar, suelta para enviar
            </p>
          </div>
        </div>

        <AudiosChecklist audios={audios} onEliminar={onEliminarAudio} />
      </div>

      {/* Galería con todas las fotos cargadas */}
      <GaleriaTodasLasFotos fotos={fotos} onEliminarFoto={onEliminarFoto} />

      {/* Botón final de guardar */}
      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        style={{ minHeight: '64px' }}
        className="flota-cta-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl text-base"
      >
        {guardando ? (
          <>
            <span className="animate-spin">⏳</span> Guardando…
          </>
        ) : (
          '✅ Guardar checklist'
        )}
      </button>

      {/* Avisos contextuales */}
      {huboIncidencia === true && textoIncidencia.trim() && !hayFotoIncidencia && (
        <p className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-center text-sm font-semibold text-error">
          ⚠️ Escribiste la incidencia pero no subiste su foto. Sube al menos una foto de evidencia.
        </p>
      )}
      {huboIncidencia === null && (
        <p className="rounded-xl border border-warning/40 bg-warning/15 px-4 py-3 text-center text-sm font-semibold text-warning">
          ⚠️ Responde si hubo o no una incidencia para poder guardar.
        </p>
      )}
    </div>
  )
}