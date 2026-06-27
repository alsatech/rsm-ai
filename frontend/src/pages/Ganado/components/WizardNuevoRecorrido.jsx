import { useState } from 'react'

import PantallaEnCurso from './PantallaEnCurso'
import PantallaFinalizar from './PantallaFinalizar'
import PantallaIniciar from './PantallaIniciar'

/**
 * Flujo de nuevo recorrido: iniciar → en_curso → finalizar
 * recorridoInicial: { id, color, paradas } para reanudar un recorrido en_curso desde el historial
 */
export default function WizardNuevoRecorrido({ recorridoInicial, onVolver, onGuardado }) {
  const [pantalla, setPantalla] = useState(recorridoInicial ? 'en_curso' : 'iniciar')
  const [recorridoId, setRecorridoId] = useState(recorridoInicial?.id ?? null)
  const [color, setColor] = useState(recorridoInicial?.color ?? 'azul_claro')
  const [paradas, setParadas] = useState(recorridoInicial?.paradas ?? [])

  if (pantalla === 'iniciar') {
    return (
      <PantallaIniciar
        onVolver={onVolver}
        onIniciado={(r) => {
          setRecorridoId(r.id)
          setColor(r.color)
          setParadas([])
          setPantalla('en_curso')
        }}
      />
    )
  }

  if (pantalla === 'en_curso') {
    return (
      <PantallaEnCurso
        recorridoId={recorridoId}
        color={color}
        paradas={paradas}
        onParadasChange={setParadas}
        onVolver={onVolver}
        onFinalizar={() => setPantalla('finalizar')}
      />
    )
  }

  return (
    <PantallaFinalizar
      recorridoId={recorridoId}
      colorInicial={color}
      onVolver={() => setPantalla('en_curso')}
      onGuardado={onGuardado}
    />
  )
}
