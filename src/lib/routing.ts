import { haversineKm, type LatLng } from './places'
import { fetchWithTimeout } from './net'

export interface RouteResult {
  km: number
  minutes: number
  coords: LatLng[]
  /** 'osrm' = rota viária real; 'estimate' = linha reta × fator (aproximação, tracejada). */
  source: 'osrm' | 'estimate'
}

const cache = new Map<string, RouteResult>()

// Servidor público de demonstração do OSRM (sem SLA). Pode ficar indisponível.
const OSRM = 'https://router.project-osrm.org/route/v1/driving'

export function estimateRoute(a: LatLng, b: LatLng): RouteResult {
  const km = Math.max(0.1, haversineKm(a, b) * 1.3)
  return { km, minutes: Math.max(1, (km / 28) * 60), coords: [a, b], source: 'estimate' }
}

export async function fetchRoute(a: LatLng, b: LatLng, signal?: AbortSignal): Promise<RouteResult> {
  const key = `${a}|${b}`
  const hit = cache.get(key)
  if (hit) return hit
  const url = `${OSRM}/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`
  const res = await fetchWithTimeout(url, {}, 8000, signal)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  const r = data.routes?.[0]
  if (!r) throw new Error('sem rota')
  const out: RouteResult = {
    km: r.distance / 1000,
    minutes: Math.max(1, r.duration / 60),
    coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as LatLng),
    source: 'osrm',
  }
  cache.set(key, out)
  return out
}
