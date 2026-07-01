import { useState } from 'react'

import { getRecorridoLocal, guardarRecorridoLocal } from '../../../api/ganadoOffline'
import PantallaEnCurso from './PantallaEnCurso'
import PantallaFinalizar from './PantallaFinalizar'
import PantallaIniciar from './PantallaIniciar'

function recorridoLocalDesdeServidor(r) {
  const paradas = (r.paradas || []).map((p) => ({
    corraleta_id: p.corraleta ?? null,
    nombre_libre: p.nombre_libre ?? null,
    lat: p.corraleta_detalle?.lat ?? p.lat ?? null,
    lng: p.corraleta_detalle?.lng ?? p.lng ?? null,
    nombre: p.corraleta_detalle?.nombre ?? p.nombre_libre ?? 'Punto libre',
    orden: p.orden,
    timestamp: p.hora_llegada ?? null,
  }))
  return {
    id: r.id,
    fecha: r.fecha,
    color: r.color,
    asistentes: (r.asistentes_detalle || []).map((a) => a.id),
    paradas,
    iniciado_en: r.hora_inicio,
    pendiente_creacion: false,
    pendiente_sync: false,
    fase: 'en_curso',
  }
}

/**
 * Flujo de nuevo recorrido: iniciar → en_curso → finalizar
 * recorridoInicial: recorrido en_curso traído del servidor (al reanudar desde el historial)
 * Durante el recorrido, localStorage (vía src/api/ganadoOffline.js) es la fuente de verdad.
 */
export default function WizardNuevoRecorrido({ recorridoInicial, onVolver, onGuardado }) {
  const [recorridoLocal, setRecorridoLocal] = useState(() => {
    if (!recorridoInicial) return null
    const existente = getRecorridoLocal()
    if (existente && existente.id === recorridoInicial.id) return existente
    const fresco = recorridoLocalDesdeServidor(recorridoInicial)
    guardarRecorridoLocal(fresco)
    return fresco
  })
  const [pantalla, setPantalla] = useState(recorridoLocal ? 'en_curso' : 'iniciar')

  const handleIniciado = (local) => {
    setRecorridoLocal(local)
    setPantalla(local.fase === 'cerrando' ? 'finalizar' : 'en_curso')
  }

  if (pantalla === 'iniciar') {
    return <PantallaIniciar onVolver={onVolver} onIniciado={handleIniciado} />
  }

  if (pantalla === 'en_curso') {
    return (
      <PantallaEnCurso
        recorridoLocal={recorridoLocal}
        onUpdate={setRecorridoLocal}
        onVolver={onVolver}
        onFinalizado={(local) => { setRecorridoLocal(local); setPantalla('finalizar') }}
      />
    )
  }

  return (
    <PantallaFinalizar
      recorridoLocal={recorridoLocal}
      onVolver={() => setPantalla('en_curso')}
      onGuardado={onGuardado}
    />
  )
}
