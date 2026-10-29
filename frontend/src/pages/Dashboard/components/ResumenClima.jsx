import { useEffect, useState } from 'react'

// Sede principal de la reserva (centroide del cerco de la casa, polígono "cercoCasa" en
// backend/media/ganado/2026/cercas.kmz) — punto fijo porque la reserva no se mueve.
const LATITUD = 29.4764
const LONGITUD = -101.4974

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}` +
  '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index' +
  '&hourly=uv_index&timezone=auto'
const AIRE_URL =
  `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LATITUD}&longitude=${LONGITUD}` +
  '&current=us_aqi,pm2_5&timezone=auto'

function nivelUV(uv) {
  if (uv == null) return null
  if (uv < 3) return { label: 'Bajo', color: 'text-highlight' }
  if (uv < 6) return { label: 'Moderado', color: 'text-warning' }
  if (uv < 8) return { label: 'Alto', color: 'text-orange-400' }
  if (uv < 11) return { label: 'Muy alto', color: 'text-error' }
  return { label: 'Extremo', color: 'text-purple-400' }
}

function nivelAQI(aqi) {
  if (aqi == null) return null
  if (aqi <= 50) return { label: 'Buena', color: 'text-highlight' }
  if (aqi <= 100) return { label: 'Moderada', color: 'text-warning' }
  if (aqi <= 150) return { label: 'Dañina (sensibles)', color: 'text-orange-400' }
  if (aqi <= 200) return { label: 'Dañina', color: 'text-error' }
  return { label: 'Muy dañina', color: 'text-purple-400' }
}

export default function ResumenClima() {
  const [clima, setClima] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(FORECAST_URL).then((r) => r.json()),
      fetch(AIRE_URL).then((r) => r.json()),
    ])
      .then(([forecast, aire]) => {
        const uvActual =
          forecast.current?.uv_index ??
          forecast.hourly?.uv_index?.[new Date().getHours()] ??
          null
        setClima({
          temperatura: forecast.current?.temperature_2m,
          humedad: forecast.current?.relative_humidity_2m,
          precipitacion: forecast.current?.precipitation,
          viento: forecast.current?.wind_speed_10m,
          uv: uvActual,
          aqi: aire.current?.us_aqi,
          pm25: aire.current?.pm2_5,
        })
      })
      .catch(() => setError(true))
  }, [])

  if (error) return null
  if (!clima) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-semibold text-text">🌦️ Clima — Reserva</p>
        <p className="mt-2 text-xs text-text-secondary">Cargando…</p>
      </div>
    )
  }

  const uv = nivelUV(clima.uv)
  const aqi = nivelAQI(clima.aqi)

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 font-semibold text-text">🌦️ Clima — Reserva</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
        <p>🌡️ {clima.temperatura != null ? `${Math.round(clima.temperatura)}°C` : 'Sin dato'}</p>
        <p>💧 Humedad: {clima.humedad != null ? `${Math.round(clima.humedad)}%` : 'Sin dato'}</p>
        <p>
          ☀️ UV: {clima.uv != null ? Math.round(clima.uv) : '—'}
          {uv && <span className={`ml-1 font-semibold ${uv.color}`}>{uv.label}</span>}
        </p>
        <p>
          🫁 Aire: {clima.aqi != null ? Math.round(clima.aqi) : '—'}
          {aqi && <span className={`ml-1 font-semibold ${aqi.color}`}>{aqi.label}</span>}
        </p>
        <p>🌬️ Viento: {clima.viento != null ? `${Math.round(clima.viento)} km/h` : 'Sin dato'}</p>
        <p>🌧️ Lluvia: {clima.precipitacion != null ? `${clima.precipitacion} mm` : 'Sin dato'}</p>
      </div>
      <p className="mt-2 text-[10px] text-text-secondary">Datos: Open-Meteo · se actualiza al abrir el dashboard</p>
    </div>
  )
}
