/**
 * Ray casting: ¿el punto (lat, lng) cae dentro del polígono?
 * poligono: array de [lat, lng] (mismo formato que CERCAS_RANCHO).
 */
export function puntoDentroDePoligono(lat, lng, poligono) {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [latI, lngI] = poligono[i]
    const [latJ, lngJ] = poligono[j]
    const cruza =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI
    if (cruza) dentro = !dentro
  }
  return dentro
}
