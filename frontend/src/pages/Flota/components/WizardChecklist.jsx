import { useState } from 'react'

import { createChecklist, subirFotoChecklist } from '../../../api/flota'
import { useToast } from '../../../hooks/useToast'
import { esOffRoad, sinKilometraje } from '../constants'
import Paso1Identificacion from './Paso1Identificacion'
import Paso2Inspeccion from './Paso2Inspeccion'

const PASOS = [
  { num: 1, titulo: 'Identificación' },
  { num: 2, titulo: 'Inspección y evidencia' },
]

function estadoInicial(vehiculoPreseleccionado) {
  const noPuedeSalir = ['en_taller', 'de_baja'].includes(vehiculoPreseleccionado?.estado)
  return {
    vehiculo: vehiculoPreseleccionado?.id ?? null,
    tipo_reporte: noPuedeSalir ? 'llegada' : 'salida',
    // El responsable lo asigna el backend con el usuario logueado — no se pide en el formulario.
    proyecto: null,
    // Kilometraje — informativo, se puede dejar vacío (la fuente de la verdad es la foto del tablero).
    km_reporte: vehiculoPreseleccionado?.kilometraje_actual != null
      ? String(vehiculoPreseleccionado.kilometraje_actual)
      : '',
    nivel_combustible: null,
    estado_fisico: false,
    lavado: false,
    soplado_filtro_aire: false,
    anticongelante: false,
    nivel_aceite_motor: false,
    nivel_aceite_transmision: false,
    carga_traila: false,
    traila: null,
    limpieza: false,
    sin_herramientas: false,
    sin_carga: false,
    // Incidencias — respuesta Sí/No + texto + foto. Solo el campo del tipo correspondiente se usa.
    hubo_incidencia: null,
    incidencia_previa: '',
    incidencia_nueva: '',
    observaciones: '',
  }
}

export default function WizardChecklist({ vehiculoPreseleccionado, onVolver, onGuardado }) {
  const { showToast } = useToast()
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState(() => estadoInicial(vehiculoPreseleccionado))
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)

  const kilometrajeActual = vehiculoPreseleccionado?.kilometraje_actual != null
    ? Number(vehiculoPreseleccionado.kilometraje_actual)
    : null

  const noPuedeSalir = ['en_taller', 'de_baja'].includes(vehiculoPreseleccionado?.estado)
  // El responsable ya no se pide — lo pone el backend con el usuario logueado.
  // El proyecto es obligatorio para poder dar seguimiento al checklist.
  const puedeAvanzar1 = Boolean(
    form.vehiculo
    && form.proyecto
    && !(noPuedeSalir && form.tipo_reporte === 'salida')
  )

  const fotosPorItem = (item) => fotos.filter((f) => f.item === item)
  const esSalida = form.tipo_reporte === 'salida'
  const itemIncidencia = esSalida ? 'incidencia_previa' : 'incidencia_nueva'
  const textoIncidencia = form[itemIncidencia] ?? ''
  const hayFotoIncidencia = fotosPorItem(itemIncidencia).length > 0
  const kilometrajeAplica = !sinKilometraje(vehiculoPreseleccionado?.tipo)
  const offRoad = esOffRoad(vehiculoPreseleccionado?.tipo)

  const estadoFisicoCompleto = ['estado_fisico_derecho', 'estado_fisico_izquierdo',
    'estado_fisico_frente', 'estado_fisico_trasero'].every((k) => fotosPorItem(k).length > 0)
  const gasolinaCompleta = fotosPorItem('gasolina').length > 0
  const kilometrajeCompleto = kilometrajeAplica && fotosPorItem('kilometraje').length > 0
  const cargaTrailaAplica = offRoad
  const cargaTrailaCompleta = cargaTrailaAplica && Boolean(form.traila) && fotosPorItem('carga_traila').length > 0
  const presionLlantasCompleta = fotosPorItem('presion_llantas').length > 0

  const itemsAplicables = (() => {
    const items = []
    if (esSalida) {
      items.push('nivel_aceite_motor', 'anticongelante')
      if (!offRoad) items.push('nivel_aceite_transmision')
      if (offRoad) items.push('soplado_filtro_aire')
    } else {
      items.push('lavado')
    }
    return items
  })()
  const itemsVerificados = itemsAplicables.filter((k) => form[k]).length
  const totalItems = itemsAplicables.length
  const obligatoriosCumplidos =
    estadoFisicoCompleto && gasolinaCompleta && (!kilometrajeAplica || kilometrajeCompleto)
    && (!cargaTrailaAplica || cargaTrailaCompleta) && presionLlantasCompleta
    && itemsVerificados === totalItems

  // Incidencia: si respondió Sí, bloquea hasta que escriba texto y suba foto.
  // Si respondió No o null, no bloquea.
  const incidenciaResuelta = form.hubo_incidencia === false
    || (form.hubo_incidencia === true && textoIncidencia.trim() && hayFotoIncidencia)
  const puedeGuardar = obligatoriosCumplidos && incidenciaResuelta

  const handleAgregarFoto = (item, file) => {
    setFotos((prev) => {
      const nuevas = [...prev, { file, preview: URL.createObjectURL(file), descripcion: '', item }]
      // Marcar el flag del ítem si la foto corresponde a uno del checklist.
      if (item === 'estado_fisico_derecho' || item === 'estado_fisico_izquierdo'
        || item === 'estado_fisico_frente' || item === 'estado_fisico_trasero') {
        const todas = ['estado_fisico_derecho', 'estado_fisico_izquierdo',
          'estado_fisico_frente', 'estado_fisico_trasero']
          .every((k) => nuevas.some((f) => f.item === k))
        setForm((prevForm) => ({ ...prevForm, estado_fisico: todas }))
      } else if (item === 'carga_traila') {
        setForm((prevForm) => ({ ...prevForm, carga_traila: true }))
      } else if (itemsAplicables.includes(item)) {
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
        if (['estado_fisico_derecho', 'estado_fisico_izquierdo',
          'estado_fisico_frente', 'estado_fisico_trasero'].includes(eliminada.item)) {
          const todas = ['estado_fisico_derecho', 'estado_fisico_izquierdo',
            'estado_fisico_frente', 'estado_fisico_trasero']
            .every((k) => restante.some((f) => f.item === k))
          setForm((prevForm) => ({ ...prevForm, estado_fisico: todas }))
        } else if (eliminada.item === 'carga_traila') {
          const quedaOtra = restante.some((f) => f.item === 'carga_traila')
          if (!quedaOtra) setForm((prevForm) => ({ ...prevForm, carga_traila: false, traila: null }))
        } else if (itemsAplicables.includes(eliminada.item)) {
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
      const payload = { ...form }
      // Si no hubo incidencia, limpiamos el texto del tipo que no aplica.
      if (payload.hubo_incidencia !== true) {
        payload.incidencia_previa = ''
        payload.incidencia_nueva = ''
      }
      if (payload.km_reporte === '' || payload.km_reporte == null) {
        payload.km_reporte = null
      }
      if (payload.nivel_combustible == null) {
        payload.nivel_combustible = null
      }

      const { data: checklist } = await createChecklist(payload)

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
            <p className="text-xs text-text-secondary">Paso {paso} de {PASOS.length} — {PASOS[paso - 1].titulo}</p>
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
            huboIncidencia={form.hubo_incidencia}
            onHuboIncidencia={(valor) => setForm((prev) => ({ ...prev, hubo_incidencia: valor }))}
            itemIncidencia={itemIncidencia}
            textoIncidencia={textoIncidencia}
            hayFotoIncidencia={hayFotoIncidencia}
            obligatorio={puedeGuardar}
            guardando={guardando}
            onGuardar={handleGuardar}
          />
        )}

        {paso < PASOS.length ? (
          <div className={`mt-6 flex gap-3 ${paso === 1 ? 'justify-end' : ''}`}>
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
              disabled={paso === 1 && !puedeAvanzar1}
              style={{ minHeight: '56px' }}
              className={`rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                paso === 1 ? 'w-full' : 'flex-1'
              }`}
            >
              Siguiente →
            </button>
          </div>
        ) : null}
        {paso === 1 && !puedeAvanzar1 && (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center text-sm font-semibold text-warning">
            ⚠️ Selecciona un proyecto para continuar.
          </p>
        )}
      </div>
    </div>
  )
}
