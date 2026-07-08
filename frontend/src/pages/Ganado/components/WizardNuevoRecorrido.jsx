import { useEffect, useState } from 'react'

import { getRecorrido } from '../../../api/ganado'
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
    return recorridoLocalDesdeServidor(recorridoInicial)
  })
  // Mientras validamos con el backend que el recorrido inicial sigue existiendo,
  // mostramos un loader para no mostrar la pantalla en_curso con datos de un
  // recorrido que ya no existe.
  const [validandoInicial, setValidandoInicial] = useState(Boolean(recorridoInicial?.id))
  const [pantalla, setPantalla] = useState('iniciar')

  useEffect(() => {
    if (!recorridoInicial?.id) return
    let cancelado = false
    getRecorrido(recorridoInicial.id)
      .then(({ data }) => {
        if (cancelado) return
        if (!recorridoLocal || recorridoLocal.id !== data.id) {
          const fresco = recorridoLocalDesdeServidor(data)
          guardarRecorridoLocal(fresco)
          setRecorridoLocal(fresco)
        }
        setPantalla('en_curso')
      })
      .catch((err) => {
        if (cancelado) return
        // 404: el recorrido no existe en el backend. Limpiamos el local si
        // apuntaba al mismo id, y mostramos la pantalla normal de iniciar
        // recorrido para que el usuario pueda crear uno nuevo.
        if (err?.response?.status === 404) {
          limpiarRecorridoSiCoincide(recorridoInicial.id)
        }
        setRecorridoLocal(null)
        setPantalla('iniciar')
      })
      .finally(() => {
        if (!cancelado) setValidandoInicial(false)
      })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorridoInicial?.id])

  const handleIniciado = (local) => {
    setRecorridoLocal(local)
    setPantalla(local.fase === 'cerrando' ? 'finalizar' : 'en_curso')
  }

  if (validandoInicial) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bg">
        <p className="text-sm text-text-secondary">Cargando recorrido…</p>
      </div>
    )
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

function limpiarRecorridoSiCoincide(id) {
  const local = getRecorridoLocal()
  if (local?.id === id) {
    localStorage.removeItem('rsm_recorrido_activo')
  }
}
