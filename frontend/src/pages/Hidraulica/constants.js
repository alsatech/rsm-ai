// Choices del modelo RegistroHidraulico (backend: apps/hidraulica/models.py)

export const PUNTOS_MEDICION = [
  { value: 'pila_norte_1', label: 'Pila Norte 1' },
  { value: 'pila_norte_2', label: 'Pila Norte 2' },
  { value: 'pila_sur_1', label: 'Pila Sur 1' },
  { value: 'pila_centro', label: 'Pila Centro' },
  { value: 'fluxometro_linea_a', label: 'Fluxómetro Línea A' },
  { value: 'fluxometro_linea_b', label: 'Fluxómetro Línea B' },
  { value: 'manometro_trampa_sur', label: 'Manómetro Trampa Sur' },
  { value: 'manometro_casa_norte', label: 'Manómetro Casa Norte' },
  { value: 'pluviometro_1', label: 'Pluviómetro 1' },
  { value: 'pluviometro_2', label: 'Pluviómetro 2' },
]

export const PUNTOS_PLUVIOMETRO = ['pluviometro_1', 'pluviometro_2']

export const ESTADOS = [
  { value: 'normal', label: 'Normal', activeClassName: 'border-highlight bg-highlight/10 text-highlight' },
  { value: 'alerta', label: 'Alerta', activeClassName: 'border-warning bg-warning/10 text-warning' },
  { value: 'falla', label: 'Falla', activeClassName: 'border-error bg-error/10 text-error' },
]

export const ESTADO_BADGE = {
  normal: 'border-highlight text-highlight',
  alerta: 'border-warning text-warning',
  falla: 'border-error text-error',
}
