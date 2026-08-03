// Wrapper compartido por las vistas principales del módulo Flota.
// Aplica el fondo claro con dos blobs decorativos y un header sticky glass.
// Feel mobile-first: contenedor centrado en max-w-4xl (896px) en todos los tamaños.
// El sidebar interno del dashboard se hace lateral solo desde 2xl: (≥1536px),
// donde el resto del viewport queda libre para el panel de alertas.
export default function FlotaLayout({ children, headerContent }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-flotabg">
      {/* Blobs decorativos con blur — atmósfera tipo imagen de referencia */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-highlight/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-warning/10 blur-3xl" />

      {headerContent && (
        <header className="sticky top-0 z-20 glass-card-strong border-0">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
            {headerContent}
          </div>
        </header>
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-5">
        {children}
      </div>
    </div>
  )
}
