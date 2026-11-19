import { haversineKm, inDemoBounds, normalize, type LatLng, type Place } from './places'

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
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(url, { signal: ctrl.signal })
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
  } finally {
    clearTimeout(timer)
  }
}

/* ---------- Nominatim (somente por ação explícita do usuário, ≤1 req/s, com cache) ---------- */

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const geoCache = new Map<string, Place[]>()
let lastCall = 0

async function throttle() {
  const wait = lastCall + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
}

function isAraguatins(addr: Record<string, string> | undefined): boolean {
  if (!addr) return false
  const city = normalize(addr.city || addr.town || addr.municipality || addr.village || '')
  return city === 'araguatins' && (addr.state === 'Tocantins' || addr['ISO3166-2-lvl4'] === 'BR-TO')
}

export async function searchAddress(q: string): Promise<Place[]> {
  const key = normalize(q)
  const hit = geoCache.get(key)
  if (hit) return hit
  await throttle()
  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=br&bounded=1` +
    `&viewbox=-48.16,-5.56,-48.0,-5.74&q=${encodeURIComponent(q + ' Araguatins')}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const rows = (await res.json()) as any[]
  const out: Place[] = rows
    .filter((r) => isAraguatins(r.address))
    .map((r) => ({
      id: `osm-${r.osm_type}-${r.osm_id}`,
      title: r.name || r.address?.road || String(r.display_name).split(',')[0],
      subtitle: [r.address?.road, r.address?.suburb, 'Araguatins - TO'].filter(Boolean).join(', '),
      position: [parseFloat(r.lat), parseFloat(r.lon)] as LatLng,
      icon: 'pin' as const,
    }))
    .filter((p) => inDemoBounds(p.position))
  geoCache.set(key, out)
  return out
}

/** Valida um ponto escolhido no mapa: precisa estar nos limites e (se a rede responder) ser de Araguatins. */
export async function validateMapPoint(pos: LatLng): Promise<{ ok: boolean; label: string; verified: boolean }> {
  if (!inDemoBounds(pos)) return { ok: false, label: '', verified: false }
  try {
    await throttle()
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${pos[0]}&lon=${pos[1]}`,
      { headers: { 'Accept-Language': 'pt-BR' } },
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const r = await res.json()
    if (r.error) return { ok: true, label: 'Ponto no mapa', verified: false }
    if (!isAraguatins(r.address)) return { ok: false, label: '', verified: true }
    const label = r.address?.road ? `${r.address.road}${r.address.suburb ? ', ' + r.address.suburb : ''}` : 'Ponto no mapa'
    return { ok: true, label, verified: true }
  } catch {
    return { ok: true, label: 'Ponto no mapa', verified: false }
  }
}
