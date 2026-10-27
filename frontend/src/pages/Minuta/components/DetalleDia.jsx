import { ESTADO_HIDRAULICA_COLOR, formatHora } from '../constants'

function Seccion({ icono, titulo, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-sm font-semibold text-text">{icono} {titulo}</p>
      {children}
    </div>
  )
}

function Vacio({ texto }) {
  return <p className="text-sm text-text-secondary">{texto}</p>
}

function SeccionHidraulica({ registros }) {
  return (
    <Seccion icono="💧" titulo="Hidráulica y pluviómetros">
      {registros.length === 0 ? (
        <Vacio texto="Sin lecturas capturadas este día." />
      ) : (
        <div className="flex flex-col gap-2">
          {registros.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div>
                <p className="font-semibold text-text">{r.punto_medicion}</p>
                <p className="text-xs text-text-secondary">
                  {formatHora(r.hora)} · {r.reportado_por}
                  {r.observaciones ? ` · ${r.observaciones}` : ''}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-bold uppercase ${ESTADO_HIDRAULICA_COLOR[r.estado] ?? 'text-text'}`}>
                {r.estado_display}
              </span>
            </div>
          ))}
        </div>
      )}
    </Seccion>
  )
}

function ListaPendientes({ pendientes, vacioTexto }) {
  if (pendientes.length === 0) return <Vacio texto={vacioTexto} />
  return (
    <div className="flex flex-col gap-2">
      {pendientes.map((p) => (
        <div key={p.id} className="rounded-xl border border-border px-4 py-3">
          <p className="font-semibold text-text">{p.titulo}</p>
          <p className="text-xs text-text-secondary">
            {p.estado_display}
            {p.motivo_bloqueo ? ` · ${p.motivo_bloqueo}` : ''}
            {p.asignados.length > 0 ? ` · ${p.asignados.join(', ')}` : ''}
          </p>
          {p.solucion_cierre && <p className="mt-1 text-xs text-text-secondary">Solución: {p.solucion_cierre}</p>}
        </div>
      ))}
    </div>
  )
}

function SeccionPendientes({ pendientes }) {
  return (
    <Seccion icono="📋" titulo="Pendientes">
      <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">Abiertos / bloqueados</p>
      <ListaPendientes pendientes={pendientes.abiertos_y_bloqueados} vacioTexto="Sin pendientes abiertos ni bloqueados." />
      <p className="mb-2 mt-4 text-xs font-semibold uppercase text-text-secondary">Cerrados hoy</p>
      <ListaPendientes pendientes={pendientes.cerrados_hoy} vacioTexto="Sin pendientes cerrados hoy." />
    </Seccion>
  )
}

function SeccionFlota({ flota }) {
  return (
    <Seccion icono="🚚" titulo="Flota vehicular">
      {flota.checklists.length === 0 ? (
        <Vacio texto="Sin checklists registrados este día." />
      ) : (
        <div className="flex flex-col gap-2">
          {flota.checklists.map((c) => {
            const incidencia = c.incidencia_previa || c.incidencia_nueva
            return (
              <div key={c.id} className="rounded-xl border border-border px-4 py-3">
                <p className="font-semibold text-text">{c.vehiculo} — {c.tipo_reporte}</p>
                <p className="text-xs text-text-secondary">{formatHora(c.hora)} · {c.responsable}</p>
                {incidencia && <p className="mt-1 text-xs text-error">⚠️ {incidencia}</p>}
                {c.advertencias.map((a, i) => (
                  <p key={i} className="mt-1 text-xs text-yellow-400">⚠️ {a}</p>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </Seccion>
  )
}

function SeccionGanado({ ganado }) {
  return (
    <Seccion icono="🐄" titulo="Ganado y recorridos">
      {ganado.recorridos.length === 0 ? (
        <Vacio texto="Sin recorridos registrados este día." />
      ) : (
        <div className="flex flex-col gap-2">
          {ganado.recorridos.map((r) => (
            <div key={r.id} className="rounded-xl border border-border px-4 py-3">
              <p className="font-semibold text-text">
                {r.responsable} {r.numero_cabezas ? `· ${r.numero_cabezas} cabezas` : ''}
              </p>
              {r.estado_hato && <p className="text-xs text-text-secondary">Estado del hato: {r.estado_hato}</p>}
              {r.narrativa && <p className="mt-1 text-xs text-text-secondary">{r.narrativa}</p>}
            </div>
          ))}
        </div>
      )}
      {ganado.alertas.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-text-secondary">Alertas SPOT</p>
          {ganado.alertas.map((a) => (
            <p key={a.id} className={`text-xs ${a.resuelta ? 'text-text-secondary' : 'text-error'}`}>
              {a.resuelta ? '✅' : '⚠️'} {a.tipo}: {a.mensaje}
            </p>
          ))}
        </div>
      )}
    </Seccion>
  )
}

export default function DetalleDia({ datos }) {
  return (
    <div className="flex flex-col gap-4">
      <SeccionHidraulica registros={datos.hidraulica} />
      <SeccionPendientes pendientes={datos.pendientes} />
      <SeccionFlota flota={datos.flota} />
      <SeccionGanado ganado={datos.ganado} />
    </div>
  )
}
