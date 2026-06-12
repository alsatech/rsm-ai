export default function ModuleCard({ icono, nombre, descripcion }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-highlight">
      <div className="text-3xl">{icono}</div>
      <h3 className="mt-3 font-bold text-text">{nombre}</h3>
      <p className="mt-1 text-sm text-text-secondary">{descripcion}</p>
    </div>
  )
}
