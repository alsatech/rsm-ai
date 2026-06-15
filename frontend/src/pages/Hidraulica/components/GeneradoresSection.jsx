import GeneradorCard from './GeneradorCard'

export default function GeneradoresSection({ generadores, puedeActualizarHoras, puedeVerAlertas, onActualizarHoras }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold text-text">Generadores</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {generadores.map((generador) => (
          <GeneradorCard
            key={generador.id}
            generador={generador}
            puedeActualizarHoras={puedeActualizarHoras}
            puedeVerAlertas={puedeVerAlertas}
            onActualizarHoras={onActualizarHoras}
          />
        ))}
      </div>
    </section>
  )
}
