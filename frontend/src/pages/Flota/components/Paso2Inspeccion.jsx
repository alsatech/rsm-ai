import { useEffect, useRef, useState } from 'react'

import { getVehiculos } from '../../../api/flota'
import {
  ESTADO_FISICO_INTERIOR,
  GASOLINA_ITEM,
  GASOLINA_OPCIONES,
  MODELO_TRAILA_PERMITIDO,
  NIVEL_COMBUSTIBLE_MINIMO_SALIDA,
  PRESION_LLANTAS_OPCIONES,
  esOffRoad,
  esTraila,
  fotoSlotsAplicables,
  resumenChecklist,
  sinKilometraje,
} from '../constants'

function IconoSeccion({ icono }) {
  return (
    <span className="widget-glow flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-card text-xl">
      {icono}
    </span>
  )
}

function BotonFoto({ item, fotos, onAgregarFoto, onEliminarFoto, disabled }) {
  const inputRef = useRef(null)
  const indexFoto = fotos.findIndex((f) => f.item === item)
  const foto = indexFoto >= 0 ? fotos[indexFoto] : null

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) onAgregarFoto(item, file)
    e.target.value = ''
  }

  if (foto) {
    return (
      <div className="widget-glow-active relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-highlight">
        <img src={foto.preview} alt={item} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onEliminarFoto(indexFoto)}
          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-bg/80 text-xs text-error"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        style={{ minHeight: '56px', minWidth: '56px' }}
        className="widget-glow flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-accent text-2xl transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
      >
        📷
      </button>
    </>
  )
}

// Un solo botón para subir todas las fotos — se van asignando en orden a la siguiente
// casilla pendiente. Si sobran fotos, se guardan como evidencia adicional (Paso 3).
function SubidorMasivo({ slots, fotos, onAgregarFoto, onEliminarFoto }) {
  const inputRef = useRef(null)

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
          <h2 className="text-lg font-bold text-text">Evidencia fotográfica</h2>
          <p className="text-xs text-text-secondary">Toma varias fotos seguidas o elige varias de tu galería</p>
        </div>
        <span className="font-mono text-sm font-bold text-text-secondary">{completados}/{slots.length}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{ minHeight: '64px' }}
        className="widget-glow-input flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-card text-base font-bold text-text transition"
      >
        📷 Tomar o elegir fotos
      </button>
      <p className="text-xs text-text-secondary">
        Se van palomeando solas, en orden — no importa cuál foto va primero.
      </p>

      <div className="widget-glow flex flex-col divide-y divide-accent/15 overflow-hidden rounded-xl border border-accent/25 bg-card">
        {slots.map((slot) => {
          const indexFoto = fotos.findIndex((f) => f.item === slot.item)
          const listo = indexFoto >= 0
          return (
            <button
              key={slot.item}
              type="button"
              onClick={() => listo && onEliminarFoto(indexFoto)}
              style={{ minHeight: '52px' }}
              className={`flex items-center gap-3 px-4 text-left transition ${listo ? 'bg-highlight/10' : ''}`}
            >
              <span className="text-xl">{slot.icon}</span>
              <span className={`flex-1 text-sm font-semibold ${listo ? 'text-text' : 'text-text-secondary'}`}>
                {slot.label}
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                  listo ? 'border-highlight bg-highlight text-bg' : 'border-accent/40'
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

// Diagrama del vehículo visto desde arriba — tocar la llanta en problemas en vez de leer texto.
function DiagramaLlantas({ valor, onSeleccionar }) {
  const claseLlanta = (val) => {
    if (valor === val) {
      return val === 'bien'
        ? 'widget-glow-active border-highlight bg-highlight/25'
        : 'widget-glow-active border-error bg-error/30'
    }
    if (valor === 'bien') return 'widget-glow-active border-highlight bg-highlight/15'
    return 'widget-glow border-accent/40 bg-card'
  }

  const opcionActual = PRESION_LLANTAS_OPCIONES.find((op) => op.value === valor)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: 190, height: 250 }}>
        {/* Carrocería vista desde arriba */}
        <div className="widget-glow absolute left-1/2 top-0 h-full w-[104px] -translate-x-1/2 rounded-[36px] border-2 border-accent/40 bg-card" />
        <div className="absolute left-1/2 top-9 h-9 w-14 -translate-x-1/2 rounded-lg border border-accent/30" />
        <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          Frente
        </span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          Atrás
        </span>

        {/* 4 llantas tocables */}
        <button
          type="button"
          onClick={() => onSeleccionar('delantero_izquierdo')}
          style={{ top: 30, left: -8 }}
          className={`absolute h-16 w-11 rounded-lg border-2 transition ${claseLlanta('delantero_izquierdo')}`}
        />
        <button
          type="button"
          onClick={() => onSeleccionar('delantero_derecho')}
          style={{ top: 30, right: -8 }}
          className={`absolute h-16 w-11 rounded-lg border-2 transition ${claseLlanta('delantero_derecho')}`}
        />
        <button
          type="button"
          onClick={() => onSeleccionar('trasero_izquierdo')}
          style={{ bottom: 30, left: -8 }}
          className={`absolute h-16 w-11 rounded-lg border-2 transition ${claseLlanta('trasero_izquierdo')}`}
        />
        <button
          type="button"
          onClick={() => onSeleccionar('trasero_derecho')}
          style={{ bottom: 30, right: -8 }}
          className={`absolute h-16 w-11 rounded-lg border-2 transition ${claseLlanta('trasero_derecho')}`}
        />
      </div>

      {opcionActual && (
        <p className={`text-sm font-semibold ${opcionActual.value === 'bien' ? 'text-text' : 'text-error'}`}>
          {opcionActual.icon} {opcionActual.label}
        </p>
      )}

      <button
        type="button"
        onClick={() => onSeleccionar('bien')}
        style={{ minHeight: '56px' }}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 text-base font-bold transition ${claseLlanta('bien')}`}
      >
        ✅ Todas las llantas están bien
      </button>
    </div>
  )
}

export default function Paso2Inspeccion({ form, setForm, tipoVehiculo, kilometrajeActual, fotos, onAgregarFoto, onEliminarFoto }) {
  const [trailas, setTrailas] = useState([])
  const { verificados, total, completo } = resumenChecklist({ form, fotos, tipoVehiculo, kilometrajeActual })
  const slots = fotoSlotsAplicables({ form, tipoVehiculo })
  const offRoad = esOffRoad(tipoVehiculo)
  const unidad = offRoad ? 'horas' : 'km'
  const kmInvalido = kilometrajeActual != null && form.km_reporte !== '' && Number(form.km_reporte) < kilometrajeActual
  const gasolinaSeleccionada = form.nivel_combustible !== null && form.nivel_combustible !== undefined
  const gasolinaInsuficiente = form.tipo_reporte === 'salida' && gasolinaSeleccionada
    && form.nivel_combustible < NIVEL_COMBUSTIBLE_MINIMO_SALIDA
  const kilometrajeAplica = !sinKilometraje(tipoVehiculo)
  const presionAplica = form.tipo_reporte === 'salida'

  const esTrailaVehiculo = esTraila(tipoVehiculo)

  useEffect(() => {
    if (!offRoad) return
    getVehiculos()
      .then(({ data }) => setTrailas(
        data.filter((v) => v.tipo === 'traila' && v.modelo === MODELO_TRAILA_PERMITIDO)
      ))
      .catch(() => setTrailas([]))
  }, [offRoad])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <span
          className={`widget-glow inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-text ${
            completo ? 'border-highlight/40 bg-highlight/10' : 'border-warning/40 bg-warning/10'
          }`}
        >
          {completo ? '✅' : '⏳'} {verificados} de {total} ítems verificados
        </span>
      </div>

      {esTrailaVehiculo && (
        <p className="-mt-3 text-center text-xs text-text-secondary">
          Checklist de la traila — no tiene motor ni combustible, solo se revisan llantas y limpieza.
        </p>
      )}

      {/* Kilometraje — solo el valor, la foto se sube abajo con el resto de la evidencia */}
      {kilometrajeAplica && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconoSeccion icono="🔢" />
            <div>
              <h2 className="text-lg font-bold text-text">
                {offRoad ? 'Horas actuales' : 'Kilometraje actual'} <span className="text-error">*</span>
              </h2>
              <p className="text-xs text-text-secondary">Escribe el número que marca el tablero</p>
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
              className={`widget-glow-input w-full rounded-xl border-2 bg-card px-4 text-3xl font-bold text-text outline-none ${
                kmInvalido ? 'border-error' : 'border-accent/40'
              }`}
              placeholder="0"
            />
            <span
              style={{ minHeight: '64px' }}
              className="widget-glow-input flex w-20 shrink-0 items-center justify-center rounded-xl border-2 border-accent/40 bg-card text-base font-bold text-text-secondary"
            >
              {offRoad ? 'hrs' : 'km'}
            </span>
          </div>
          {kilometrajeActual != null && (
            <p className={`text-xs ${kmInvalido ? 'text-error' : 'text-text-secondary'}`}>
              {kmInvalido
                ? `No puede ser menor al valor actual (${kilometrajeActual.toLocaleString('es-MX')} ${unidad}).`
                : `Valor actual: ${kilometrajeActual.toLocaleString('es-MX')} ${unidad} — solo puede subir ↑`}
            </p>
          )}
        </div>
      )}

      {/* Gasolina — como marca el tablero real del vehículo, sin foto */}
      {!esTrailaVehiculo && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconoSeccion icono={GASOLINA_ITEM.icon} />
            <div>
              <h2 className="text-lg font-bold text-text">{GASOLINA_ITEM.label}</h2>
              <p className="text-xs font-semibold text-highlight">Toca el nivel que marca la aguja</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {GASOLINA_OPCIONES.map((op) => {
              const activo = form.nivel_combustible === op.value
              return (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, nivel_combustible: op.value }))}
                  style={{
                    minHeight: '56px',
                    borderColor: activo ? op.color : `${op.color}55`,
                    backgroundColor: activo ? `${op.color}33` : `${op.color}14`,
                    boxShadow: activo
                      ? `0 0 0 1px ${op.color}80, 0 0 22px -2px ${op.color}b3`
                      : `0 0 12px -6px ${op.color}80`,
                  }}
                  className="flex items-center justify-center rounded-xl border-2 text-lg font-bold text-text transition"
                >
                  {op.label}
                </button>
              )
            })}
          </div>
          {gasolinaInsuficiente && (
            <p className="text-xs font-semibold text-error">
              ⚠️ Ningún vehículo debe salir a campo con menos de medio tanque de gasolina.
            </p>
          )}
        </div>
      )}

      {/* Carga de la traila — solo elegir cuál traila (solo 4x5), la foto se sube abajo */}
      {offRoad && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconoSeccion icono="🚚" />
            <div>
              <h2 className="text-lg font-bold text-text">Carga de la traila</h2>
              <p className="text-xs text-text-secondary">Elige cuál traila vas a jalar</p>
            </div>
          </div>
          <select
            value={form.traila ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, traila: e.target.value ? Number(e.target.value) : null }))}
            style={{ minHeight: '56px' }}
            className="widget-glow-input w-full rounded-xl border-2 border-accent/40 bg-card px-3 text-sm text-text outline-none"
          >
            <option value="" disabled>Selecciona la traila</option>
            {trailas.map((t) => (
              <option key={t.id} value={t.id}>{t.equipo || t.nombre}</option>
            ))}
          </select>
          <p className="text-xs text-text-secondary">
            Solo se pueden jalar trailas de {MODELO_TRAILA_PERMITIDO}.
          </p>
        </div>
      )}

      {/* Todas las fotos de evidencia en un solo lugar */}
      <SubidorMasivo slots={slots} fotos={fotos} onAgregarFoto={onAgregarFoto} onEliminarFoto={onEliminarFoto} />

      {!esTrailaVehiculo && (
        <div className="flex items-center gap-3">
          <BotonFoto
            item={ESTADO_FISICO_INTERIOR.key}
            fotos={fotos}
            onAgregarFoto={onAgregarFoto}
            onEliminarFoto={onEliminarFoto}
          />
          <p className="text-xs text-text-secondary">{ESTADO_FISICO_INTERIOR.label} — interior, asientos y pisos</p>
        </div>
      )}

      {/* Presión de llantas — al final, con dibujo del vehículo en vez de puros cuadros de texto */}
      {(presionAplica || esTrailaVehiculo) && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-bold text-text">Presión de llantas</h2>
            <p className="text-xs text-text-secondary">Toca la llanta si está baja o ponchada</p>
          </div>

          <DiagramaLlantas
            valor={form.presion_llantas}
            onSeleccionar={(val) => setForm((prev) => ({
              ...prev,
              presion_llantas: val,
              llanta_cambiada: val === 'bien' ? false : prev.llanta_cambiada,
            }))}
          />

          {form.presion_llantas && form.presion_llantas !== 'bien' && (
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, llanta_cambiada: !prev.llanta_cambiada }))}
              style={{ minHeight: '48px' }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold text-text transition ${
                form.llanta_cambiada
                  ? 'widget-glow-active border-highlight bg-highlight/20'
                  : 'widget-glow border-accent/40 bg-card'
              }`}
            >
              🔄 {form.llanta_cambiada ? 'Se cambió la llanta completa' : '¿Se cambió la llanta completa?'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
