import { useAuth } from '../../../hooks/useAuth'
import { PROYECTOS_PLACEHOLDER, TIPO_ICONOS, TIPO_LABELS } from '../constants'

export default function Paso1Identificacion({ vehiculoPreseleccionado, form, setForm }) {
  const { user: usuarioActual } = useAuth()
  const noPuedeSalir = ['en_taller', 'de_baja'].includes(vehiculoPreseleccionado?.estado)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Vehículo</p>
        {vehiculoPreseleccionado ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-highlight bg-highlight/10 px-4 py-3">
            {vehiculoPreseleccionado.foto ? (
              <img
                src={vehiculoPreseleccionado.foto}
                alt={vehiculoPreseleccionado.nombre}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <span className="text-2xl">{TIPO_ICONOS[vehiculoPreseleccionado.tipo] ?? '🚗'}</span>
            )}
            <div>
              <p className="text-sm font-semibold text-text">{vehiculoPreseleccionado.nombre}</p>
              <p className="text-xs text-text-secondary">
                {TIPO_LABELS[vehiculoPreseleccionado.tipo] ?? vehiculoPreseleccionado.tipo}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-error">No se seleccionó ningún vehículo.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Tipo de reporte *</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !noPuedeSalir && setForm((prev) => ({ ...prev, tipo_reporte: 'salida' }))}
            disabled={noPuedeSalir}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border-2 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              form.tipo_reporte === 'salida'
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary'
            }`}
          >
            🚗 Salida
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, tipo_reporte: 'llegada' }))}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border-2 text-base font-bold transition ${
              form.tipo_reporte === 'llegada'
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary'
            }`}
          >
            🏁 Llegada
          </button>
        </div>
        {noPuedeSalir && (
          <p className="mt-2 text-xs font-semibold text-error">
            ⚠️ {vehiculoPreseleccionado.nombre} está {vehiculoPreseleccionado.estado === 'en_taller' ? 'en taller' : 'de baja'} — no puede salir hasta que se repare.
          </p>
        )}
      </div>

      {/* Responsable — siempre el usuario logueado. Se muestra solo como confirmación, no se puede editar. */}
      {usuarioActual && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-text-secondary">Responsable</p>
          <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-card px-4 py-3 text-base text-text">
            <span className="text-lg">👤</span>
            <span className="font-semibold">
              {usuarioActual.nombre || usuarioActual.username}
              {usuarioActual.username ? (
                <span className="ml-1 text-xs font-normal text-text-secondary">({usuarioActual.username})</span>
              ) : null}
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            El checklist queda registrado a tu nombre automáticamente.
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="proyecto">
          Proyecto <span className="text-error">*</span>
        </label>
        <select
          id="proyecto"
          value={form.proyecto ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, proyecto: e.target.value || null }))}
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
        >
          <option value="" disabled>Selecciona el proyecto al que se vincula</option>
          {PROYECTOS_PLACEHOLDER.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text-secondary">
          Próximamente ligado al módulo de Proyectos — por ahora es solo referencia.
        </p>
      </div>
    </div>
  )
}

