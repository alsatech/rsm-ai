import { Polygon, Polyline, Tooltip } from 'react-leaflet'

import { CERCAS_RANCHO } from '../../constants/cercasRancho'

const ESTILO_CERCA = {
  color: '#FFA500',
  weight: 2,
  opacity: 0.8,
  dashArray: null,
}

/**
 * Capa de referencia visual con las cercas/lindes del rancho.
 * No es seleccionable: solo dibuja las líneas y muestra su nombre al pasar el cursor.
 */
export default function CapaCercas() {
  return (
    <>
      {CERCAS_RANCHO.map((cerca) => {
        const Forma = cerca.tipo === 'Polygon' ? Polygon : Polyline
        return (
          <Forma key={cerca.nombre} positions={cerca.coordenadas} pathOptions={ESTILO_CERCA} interactive>
            <Tooltip sticky opacity={0.95} className="tooltip-cerca">
              {cerca.nombre}
            </Tooltip>
          </Forma>
        )
      })}
    </>
  )
}
