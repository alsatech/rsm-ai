import { useEffect } from 'react'

import { iniciarRecorrido, syncParadas } from '../api/ganado'
import { getRecorridoLocal, guardarRecorridoLocal } from '../api/ganadoOffline'
import { useToast } from './useToast'

export function useGanadoSync() {
  const { showToast } = useToast()

  useEffect(() => {
    const handleOnline = async () => {
      const recorrido = getRecorridoLocal()
      if (!recorrido?.pendiente_sync) return

      try {
        let id = recorrido.id
        if (recorrido.pendiente_creacion) {
          const { data } = await iniciarRecorrido({
            fecha: recorrido.fecha,
            color: recorrido.color,
            asistentes: recorrido.asistentes,
          })
          id = data.id
        }
        await syncParadas(id, recorrido.paradas)
        guardarRecorridoLocal({
          ...recorrido,
          id,
          pendiente_creacion: false,
          pendiente_sync: false,
          fase: 'cerrando',
        })
        showToast('✅ Recorrido sincronizado. Completa el cierre cuando puedas.', 'exito')
      } catch {
        showToast('⚠️ No se pudo sincronizar, intenta manualmente.', 'error')
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [showToast])
}
