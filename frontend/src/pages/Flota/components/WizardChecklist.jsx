import { useEffect, useState } from 'react'

import { createChecklist, getVehiculos, subirFotoChecklist } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import Paso1Identificacion from './Paso1Identificacion'
import Paso2Inspeccion from './Paso2Inspeccion'
import Paso3Evidencia from './Paso3Evidencia'

const PASOS = [
  { num: 1, titulo: 'Identificación' },
  { num: 2, titulo: 'Inspección' },
  { num: 3, titulo: 'Evidencia' },
]

function estadoInicial(vehiculoPreseleccionado) {
  return {
    vehiculo: vehiculoPreseleccionado?.id ?? null,
    tipo_reporte: 'salida',
    responsable: null,
    km_reporte: '',
    nivel_combustible: 50,
    carroceria_pintura: false,
    parabrisas_vidrios: false,
    neumaticos_presion: false,
    luces_delanteras_traseras: false,
    interiores_asientos: false,
    nivel_aceite: false,
    nivel_refrigerante: false,
    nivel_liquido_frenos: false,
    frenos_respuesta: false,
    direccion_volante: false,
    suspension_amortiguadores: false,
    filtro_aire: false,
    gato: false,
    cruzeta: false,
    llanta_refaccion: false,
    caja_herramientas: false,
    cables_corriente: false,
    observaciones: '',
  }
}

export default function WizardChecklist({ vehiculoPreseleccionado, onVolver, onGuardado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [paso, setPaso] = useState(1)
  const [vehiculos, setVehiculos] = useState([])
  const [form, setForm] = useState(() => estadoInicial(vehiculoPreseleccionado))
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getVehiculos()
      .then(({ data }) => setVehiculos(data))
      .catch(() => setVehiculos([]))
  }, [])

  const puedeAvanzar1 = Boolean(form.vehiculo && form.responsable && form.km_reporte !== '')

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const { data: checklist } = await createChecklist(form)

      for (const foto of fotos) {
        const fd = new FormData()
        fd.append('foto', foto.file)
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
          <Paso1Identificacion vehiculos={vehiculos} form={form} setForm={setForm} usuarioActual={user} />
        )}
        {paso === 2 && <Paso2Inspeccion form={form} setForm={setForm} />}
        {paso === 3 && (
          <Paso3Evidencia
            fotos={fotos}
            onAgregar={(f) => setFotos((prev) => [...prev, f])}
            onEliminar={(i) => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
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
              disabled={paso === 1 && !puedeAvanzar1}
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
