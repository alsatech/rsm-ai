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
        const crearRecorrido = async () => {
          const { data } = await iniciarRecorrido({
            fecha: recorrido.fecha,
            color: recorrido.color,
            asistentes: recorrido.asistentes,
          })
          return data.id
        }
        if (recorrido.pendiente_creacion || !id) {
          id = await crearRecorrido()
        }
        try {
          await syncParadas(id, recorrido.paradas)
        } catch (err) {
          // Si el recorrido guardado ya no existe en el backend, creamos
          // uno nuevo y reintentamos antes de avisar del fallo.
          if (err?.response?.status !== 404) throw err
          id = await crearRecorrido()
          await syncParadas(id, recorrido.paradas)
        }
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
