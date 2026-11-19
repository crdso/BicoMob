import type { LatLng } from './places'
import { throttled } from './net'

/** [lng, lat] como no GeoJSON. */
type Ring = [number, number][]
type Polygon = Ring[] // [exterior, ...buracos]

export interface Boundary {
  relationId: number
  /** [sul, oeste, norte, leste] */
  bbox: [number, number, number, number]
  polygons: Polygon[]
}

// Caixa do município (relation OSM 336850), usada só enquanto o polígono real não foi carregado.
export const MUNICIPIO_BBOX: [number, number, number, number] = [-6.009, -48.452, -5.275, -47.7593]
export const MUNICIPIO_RELATION_ID = 336850

const CACHE_KEY = 'bicomob:boundary:v2'
let current: Boundary | null = null
let loading: Promise<Boundary | null> | null = null

export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function pointInPolygons(pos: LatLng, polygons: Polygon[]): boolean {
  const [lat, lng] = pos
  return polygons.some(([outer, ...holes]) => pointInRing(lng, lat, outer) && !holes.some((h) => pointInRing(lng, lat, h)))
}

function inBbox([lat, lng]: LatLng, [s, w, n, e]: [number, number, number, number]) {
  return lat >= s && lat <= n && lng >= w && lng <= e
}

export function toBoundary(geojson: { type: string; coordinates: unknown }, relationId: number): Boundary | null {
  let polygons: Polygon[]
  if (geojson.type === 'Polygon') polygons = [geojson.coordinates as Polygon]
  else if (geojson.type === 'MultiPolygon') polygons = geojson.coordinates as Polygon[]
  else return null
  let s = 90, w = 180, n = -90, e = -180
  for (const [outer] of polygons) for (const [lng, lat] of outer) {
    if (lat < s) s = lat
    if (lat > n) n = lat
    if (lng < w) w = lng
    if (lng > e) e = lng
  }
  return { relationId, bbox: [s, w, n, e], polygons }
}

export function setBoundary(b: Boundary | null) { current = b }
export function getBoundary(): Boundary | null { return current }
export function isBoundaryExact(): boolean { return current !== null }

/** Está dentro do município de Araguatins? Usa o polígono real; antes de carregar, usa só a caixa (aproximado). */
export function insideMunicipio(pos: LatLng): boolean {
  if (current) return inBbox(pos, current.bbox) && pointInPolygons(pos, current.polygons)
  return inBbox(pos, MUNICIPIO_BBOX)
}

export function loadBoundary(): Promise<Boundary | null> {
  if (current) return Promise.resolve(current)
  if (loading) return loading
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) { current = JSON.parse(raw) as Boundary; return Promise.resolve(current) }
  } catch { /* cache corrompido: baixa de novo */ }
  loading = (async () => {
    try {
      await throttled('nominatim', 1100)
      const url =
        'https://nominatim.openstreetmap.org/lookup?format=jsonv2&polygon_geojson=1&polygon_threshold=0.0008' +
        `&osm_ids=R${MUNICIPIO_RELATION_ID}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const rows = (await res.json()) as { osm_id: number; geojson?: { type: string; coordinates: unknown } }[]
      const row = rows.find((r) => r.osm_id === MUNICIPIO_RELATION_ID)
      const b = row?.geojson ? toBoundary(row.geojson, MUNICIPIO_RELATION_ID) : null
      if (b) {
        current = b
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch { /* sem storage */ }
      }
      return b
    } catch {
      return null
    } finally {
      loading = null
    }
  })()
  return loading
}
