import { useState } from 'react'

import { createChecklist, subirFotoChecklist } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import {
  CHECKLIST_ITEMS,
  ESTADO_FISICO_LADOS,
  NIVEL_COMBUSTIBLE_MINIMO_SALIDA,
  TRAILA_ITEMS,
  esTraila,
  resumenChecklist,
} from '../constants'
import Paso1Identificacion from './Paso1Identificacion'
import Paso2Inspeccion from './Paso2Inspeccion'
import Paso3Evidencia from './Paso3Evidencia'

const PASOS = [
  { num: 1, titulo: 'Identificación' },
  { num: 2, titulo: 'Inspección' },
  { num: 3, titulo: 'Evidencia' },
]

const CHECKLIST_ITEM_KEYS = [...CHECKLIST_ITEMS.map((item) => item.key), ...TRAILA_ITEMS.map((item) => item.key)]
const ESTADO_FISICO_LADO_KEYS = ESTADO_FISICO_LADOS.map((lado) => lado.key)

function estadoInicial(vehiculoPreseleccionado) {
  const esTrailaVehiculo = esTraila(vehiculoPreseleccionado?.tipo)
  const noPuedeSalir = ['en_taller', 'de_baja'].includes(vehiculoPreseleccionado?.estado)
  return {
    vehiculo: vehiculoPreseleccionado?.id ?? null,
    tipo_reporte: noPuedeSalir ? 'llegada' : 'salida',
    responsable: null,
    proyecto: null,
    km_reporte: vehiculoPreseleccionado?.kilometraje_actual != null
      ? String(vehiculoPreseleccionado.kilometraje_actual)
      : '',
    nivel_combustible: esTrailaVehiculo ? 0 : null,
    estado_fisico: false,
    lavado: false,
    soplado_filtro_aire: false,
    presion_llantas: '',
    llanta_cambiada: false,
    anticongelante: false,
    nivel_aceite_motor: false,
    nivel_aceite_transmision: false,
    carga_traila: false,
    traila: null,
    limpieza: false,
    sin_herramientas: false,
    sin_carga: false,
    observaciones: '',
  }
}

export default function WizardChecklist({ vehiculoPreseleccionado, onVolver, onGuardado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState(() => estadoInicial(vehiculoPreseleccionado))
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)

  const kilometrajeActual = vehiculoPreseleccionado?.kilometraje_actual != null
    ? Number(vehiculoPreseleccionado.kilometraje_actual)
    : null

  const noPuedeSalir = ['en_taller', 'de_baja'].includes(vehiculoPreseleccionado?.estado)
  const puedeAvanzar1 = Boolean(form.vehiculo && form.responsable && !(noPuedeSalir && form.tipo_reporte === 'salida'))

  const gasolinaValida = esTraila(vehiculoPreseleccionado?.tipo) || Boolean(
    form.nivel_combustible !== null
    && (form.tipo_reporte !== 'salida' || form.nivel_combustible >= NIVEL_COMBUSTIBLE_MINIMO_SALIDA)
  )

  const { verificados, total, completo: itemsCompletos } = resumenChecklist({
    form, fotos, tipoVehiculo: vehiculoPreseleccionado?.tipo, kilometrajeActual,
  })
  const itemsFaltantes = total - verificados
  const puedeAvanzar2 = itemsCompletos && gasolinaValida

  const actualizarEstadoFisico = (fotosActuales) => {
    const completo = ESTADO_FISICO_LADO_KEYS.every((key) => fotosActuales.some((f) => f.item === key))
    setForm((prev) => ({ ...prev, estado_fisico: completo }))
  }

  const handleAgregarFoto = (item, file) => {
    setFotos((prev) => {
      const nuevas = [...prev, { file, preview: URL.createObjectURL(file), descripcion: '', item }]
      if (ESTADO_FISICO_LADO_KEYS.includes(item)) {
        actualizarEstadoFisico(nuevas)
      } else if (item === 'carga_traila') {
        setForm((prevForm) => ({ ...prevForm, carga_traila: true }))
      } else if (CHECKLIST_ITEM_KEYS.includes(item)) {
        setForm((prevForm) => ({ ...prevForm, [item]: true }))
      }
      return nuevas
    })
  }

  const handleEliminarFoto = (index) => {
    setFotos((prev) => {
      const eliminada = prev[index]
      const restante = prev.filter((_, i) => i !== index)
      if (eliminada?.item) {
        if (ESTADO_FISICO_LADO_KEYS.includes(eliminada.item)) {
          actualizarEstadoFisico(restante)
        } else if (eliminada.item === 'presion_llantas') {
          const quedaOtra = restante.some((f) => f.item === 'presion_llantas')
          if (!quedaOtra) setForm((prevForm) => ({ ...prevForm, presion_llantas: '', llanta_cambiada: false }))
        } else if (eliminada.item === 'carga_traila') {
          const quedaOtra = restante.some((f) => f.item === 'carga_traila')
          if (!quedaOtra) setForm((prevForm) => ({ ...prevForm, carga_traila: false, traila: null }))
        } else if (CHECKLIST_ITEM_KEYS.includes(eliminada.item)) {
          const quedaOtra = restante.some((f) => f.item === eliminada.item)
          if (!quedaOtra) setForm((prevForm) => ({ ...prevForm, [eliminada.item]: false }))
        }
      }
      return restante
    })
  }

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const { data: checklist } = await createChecklist(form)

      for (const foto of fotos) {
        const fd = new FormData()
        fd.append('foto', foto.file)
        if (foto.item) fd.append('item', foto.item)
        if (foto.descripcion) fd.append('descripcion', foto.descripcion)
        await subirFotoChecklist(checklist.id, fd)
      }

      showToast('✅ Checklist guardado', 'exito')
      onGuardado?.()
    } catch {
      showToast('No se pudo guardar el checklist.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Nuevo checklist</h1>
            <p className="text-xs text-text-secondary">Paso {paso} de 3 — {PASOS[paso - 1].titulo}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          {PASOS.map((p) => (
            <div
              key={p.num}
              className={`h-1.5 flex-1 rounded-full ${paso >= p.num ? 'bg-highlight' : 'bg-border'}`}
            />
          ))}
        </div>
      </header>

      <div className="px-4 py-5">
        {paso === 1 && (
          <Paso1Identificacion
            vehiculoPreseleccionado={vehiculoPreseleccionado}
            form={form}
            setForm={setForm}
            usuarioActual={user}
          />
        )}
        {paso === 2 && (
          <Paso2Inspeccion
            form={form}
            setForm={setForm}
            tipoVehiculo={vehiculoPreseleccionado?.tipo}
            kilometrajeActual={kilometrajeActual}
            fotos={fotos}
            onAgregarFoto={handleAgregarFoto}
            onEliminarFoto={handleEliminarFoto}
          />
        )}
        {paso === 2 && !itemsCompletos && (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center text-sm font-semibold text-warning">
            ⚠️ Falta{itemsFaltantes === 1 ? '' : 'n'} {itemsFaltantes} ítem{itemsFaltantes === 1 ? '' : 's'} con foto
            de evidencia. No se puede salir sin completar el checklist.
          </p>
        )}
        {paso === 2 && itemsCompletos && !gasolinaValida && (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center text-sm font-semibold text-warning">
            ⚠️ Falta revisar la gasolina. No se puede salir sin completar el checklist.
          </p>
        )}
        {paso === 3 && (
          <Paso3Evidencia
            form={form}
            setForm={setForm}
            fotos={fotos}
            onAgregarFoto={handleAgregarFoto}
            onEliminarFoto={handleEliminarFoto}
            guardando={guardando}
            onGuardar={handleGuardar}
          />
        )}

        {paso < 3 && (
          <div className="mt-6 flex gap-3">
            {paso > 1 && (
              <button
                type="button"
                onClick={() => setPaso((p) => p - 1)}
                style={{ minHeight: '56px' }}
                className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
              >
                ← Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaso((p) => p + 1)}
              disabled={(paso === 1 && !puedeAvanzar1) || (paso === 2 && !puedeAvanzar2)}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
