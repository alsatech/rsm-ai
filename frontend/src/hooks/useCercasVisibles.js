import { useState } from 'react'

const STORAGE_KEY = 'rsm_cercas_visibles'

export function useCercasVisibles() {
  const [visible, setVisible] = useState(() => {
    const guardado = localStorage.getItem(STORAGE_KEY)
    return guardado === null ? true : guardado === 'true'
  })

  const toggle = () => {
    setVisible((prev) => {
      const nuevo = !prev
      localStorage.setItem(STORAGE_KEY, String(nuevo))
      return nuevo
    })
  }

  return [visible, toggle]
}
