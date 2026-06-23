import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

const VARIANTES = {
  pregunta: {
    icon: '❓',
    anillo: 'border-highlight/40 bg-highlight/10 text-highlight',
    confirmBtn: 'bg-accent text-text hover:bg-highlight hover:text-bg',
  },
  peligro: {
    icon: '⚠️',
    anillo: 'border-error/40 bg-error/10 text-error',
    confirmBtn: 'bg-error text-bg hover:opacity-90',
  },
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((opciones = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({
        titulo: opciones.titulo ?? '¿Estás seguro?',
        mensaje: opciones.mensaje ?? '',
        confirmText: opciones.confirmText ?? 'Sí',
        cancelText: opciones.cancelText ?? 'No',
        variante: opciones.variante ?? 'pregunta',
      })
    })
  }, [])

  const cerrar = (resultado) => {
    resolverRef.current?.(resultado)
    setDialog(null)
  }

  const conf = dialog ? (VARIANTES[dialog.variante] ?? VARIANTES.pregunta) : null

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
          onClick={() => cerrar(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
          >
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl ${conf.anillo}`}
            >
              {conf.icon}
            </div>
            <h3 className="text-lg font-bold text-text">{dialog.titulo}</h3>
            {dialog.mensaje && (
              <p className="mt-2 text-sm text-text-secondary">{dialog.mensaje}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => cerrar(false)}
                style={{ minHeight: '48px' }}
                className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => cerrar(true)}
                style={{ minHeight: '48px' }}
                className={`flex-1 rounded-xl font-bold transition ${conf.confirmBtn}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  }
  return context
}
