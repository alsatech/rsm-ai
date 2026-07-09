export const TIPO_ICONOS = {
  camioneta: '🛻',
  camion: '🚛',
  moto: '🏍️',
  cuatrimoto: '🏎️',
  utv: '🚙',
  polaris: '🏁',
  can_am: '🏁',
  remolque: '🚚',
  traila: '🚛',
  maquinaria: '🚜',
  plataforma: '🚚',
  van: '🚐',
  otro: '🚗',
}

export const TIPO_LABELS = {
  camioneta: 'Camioneta',
  camion: 'Camión',
  moto: 'Moto',
  cuatrimoto: 'Cuatrimoto',
  utv: 'UTV',
  polaris: 'Polaris',
  can_am: 'CAN AM',
  remolque: 'Remolque',
  traila: 'Traila',
  maquinaria: 'Maquinaria',
  plataforma: 'Plataforma',
  van: 'Van',
  otro: 'Otro',
}

export const ESTADO_VEHICULO_CONFIG = {
  activo: { label: 'Activo', border: 'border-highlight', text: 'text-highlight', bg: 'bg-highlight/10' },
  en_taller: { label: 'En taller', border: 'border-warning', text: 'text-warning', bg: 'bg-warning/10' },
  de_baja: { label: 'De baja', border: 'border-error', text: 'text-error', bg: 'bg-error/10' },
}

export const URGENCIA_CONFIG = {
  critico: { icon: '🔴', label: 'Crítico', border: 'border-error', text: 'text-error', bg: 'bg-error/10' },
  proximo: { icon: '🟡', label: 'Próximo', border: 'border-warning', text: 'text-warning', bg: 'bg-warning/10' },
  preventivo: { icon: '🟢', label: 'Preventivo', border: 'border-highlight', text: 'text-highlight', bg: 'bg-highlight/10' },
}

export const ALERTA_TIPO_LABELS = {
  cambio_aceite: 'Cambio de aceite',
  calibracion_llantas: 'Calibración de llantas',
  vencimiento_tenencia: 'Vencimiento de tenencia',
  vencimiento_placas: 'Vencimiento de placas',
  mantenimiento_general: 'Mantenimiento general',
}

export const CHECKLIST_GRUPOS = [
  {
    id: 'visual',
    titulo: 'Inspección visual',
    items: [
      { key: 'carroceria_pintura', label: 'Carrocería y pintura sin daños' },
      { key: 'parabrisas_vidrios', label: 'Parabrisas y vidrios limpios y sin fisuras' },
      { key: 'neumaticos_presion', label: 'Neumáticos con presión y desgaste adecuado' },
      { key: 'luces_delanteras_traseras', label: 'Luces delanteras y traseras funcionando' },
      { key: 'interiores_asientos', label: 'Interiores y asientos en buen estado' },
    ],
  },
  {
    id: 'mecanica',
    titulo: 'Revisión mecánica',
    items: [
      { key: 'nivel_aceite', label: 'Nivel de aceite del motor correcto' },
      { key: 'nivel_refrigerante', label: 'Nivel de refrigerante correcto' },
      { key: 'nivel_liquido_frenos', label: 'Nivel de líquido de frenos correcto' },
      { key: 'frenos_respuesta', label: 'Frenos con buena respuesta y sin ruidos' },
      { key: 'direccion_volante', label: 'Dirección y volante sin juego excesivo' },
      { key: 'suspension_amortiguadores', label: 'Suspensión y amortiguadores sin problemas' },
      { key: 'filtro_aire', label: 'Filtro de aire limpio' },
    ],
  },
  {
    id: 'accesorios',
    titulo: 'Accesorios a bordo',
    items: [
      { key: 'gato', label: 'Gato hidráulico presente' },
      { key: 'cruzeta', label: 'Cruceta presente' },
      { key: 'llanta_refaccion', label: 'Llanta de refacción presente' },
      { key: 'caja_herramientas', label: 'Caja de herramientas completa' },
      { key: 'cables_corriente', label: 'Cables de corriente presentes' },
    ],
  },
]

export const CHECKLIST_ITEMS_KEYS = CHECKLIST_GRUPOS.flatMap((g) => g.items.map((i) => i.key))
