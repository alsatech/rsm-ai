export const TIPO_PROVEEDOR_CONFIG = {
  material: { label: 'Proveedor de materiales', icon: '📦' },
  contratista: { label: 'Contratista', icon: '👷' },
  servicio: { label: 'Prestador de servicio', icon: '🧰' },
  otro: { label: 'Otro', icon: '🏷️' },
}

export const TABS_TIPO_PROVEEDOR = [
  { value: '', label: 'Todos' },
  { value: 'material', label: 'Materiales' },
  { value: 'contratista', label: 'Contratistas' },
  { value: 'servicio', label: 'Servicios' },
  { value: 'otro', label: 'Otro' },
]

export const ESPECIALIDADES_SUGERIDAS = [
  'Albañilería', 'Electricidad', 'Plomería', 'Herrería', 'Carpintería', 'Pintura',
  'Alimento para ganado', 'Material de construcción', 'Refacciones', 'Transporte',
]
