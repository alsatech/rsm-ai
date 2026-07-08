import { CERCAS_RANCHO } from '../constants/cercasRancho'
import { puntoDentroDePoligono } from './geo'

/**
 * Devuelve un mapa { pastaNombre: [corraletas] } particionando las corraletas
 * entre los polígonos tipo 'Polygon' de CERCAS_RANCHO. Cada corraleta queda
 * asignada a la primera pasta cuyo polígono la contiene.
 *
 * Pensado para inspección/debug desde la consola del navegador:
 *   > corraletasPorPasta(corraletas)
 * Útil también para un panel admin que muestre cuántas corraletas tiene cada
 * pasta sin necesidad de hacer click en el mapa.
 */
export function corraletasPorPasta(corraletas) {
  const polygons = CERCAS_RANCHO.filter((c) => c.tipo === 'Polygon')
  const resultado = {}
  for (const pol of polygons) {
    resultado[pol.nombre] = corraletas.filter((c) =>
      puntoDentroDePoligono(parseFloat(c.lat), parseFloat(c.lng), pol.coordenadas),
    )
  }
  return resultado
}
