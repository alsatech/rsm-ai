import { createContext, useCallback, useContext, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const ToastContext = createContext(null)

const DURACIONES = {
  exito: 3000,
  alerta: 4000,
  error: 5000,
}

const ESTILOS = {
  exito: 'bg-accent border-highlight text-text',
  alerta: 'bg-card border-warning text-warning',
  error: 'bg-card border-error text-error',
}

const ICONOS = {
  exito: '✅',
  alerta: '⚠️',
  error: '🔴',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((mensaje, tipo = 'exito') => {
    const id = uuidv4()
    setToasts((prev) => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DURACIONES[tipo] ?? DURACIONES.exito)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 font-sans text-sm shadow-lg ${ESTILOS[toast.tipo]}`}
          >
            <span className="mr-2">{ICONOS[toast.tipo]}</span>
            {toast.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}
