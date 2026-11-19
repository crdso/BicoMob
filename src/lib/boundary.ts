import muni from '../data/municipio.json'
import type { LatLng } from './places'

// Área em que a demonstração opera: o polígono REAL do município (OpenStreetMap, guardado localmente em
// src/data/municipio.json). Toda origem, destino, ponto do mapa, resultado de busca e posição de GPS é
// validado pelas coordenadas (ponto-em-polígono). A caixa (bbox) serve só para descartar rápido o que
// está obviamente fora e para limitar o mapa; nunca é a validação definitiva.

type Ring = [number, number][] // [lng, lat], como no GeoJSON
type Polygon = Ring[] // [exterior, ...buracos]

const geometry = muni.geometry as { type: string; coordinates: unknown }
const POLYGONS: Polygon[] = geometry.type === 'MultiPolygon' ? (geometry.coordinates as Polygon[]) : [geometry.coordinates as Polygon]

/** [sul, oeste, norte, leste] */
export const AREA_BBOX = muni.bbox as [number, number, number, number]
export const AREA_CENTER = muni.center as LatLng

export const MSG_GPS_OUTSIDE = 'Esta demonstração está disponível apenas para corridas em Araguatins. Escolha um ponto de partida no mapa.'
export const MSG_POINT_OUTSIDE = 'Esse ponto fica fora da área da demonstração. Escolha um local dentro do contorno destacado no mapa.'
export const MSG_PLACE_OUTSIDE = 'Esse local fica fora da área da demonstração. Escolha um endereço dentro de Araguatins.'

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

/** O ponto está dentro do município? (polígono real; a caixa só faz a triagem rápida) */
export function insideArea(pos: LatLng): boolean {
  const [lat, lng] = pos
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  const [s, w, n, e] = AREA_BBOX
  if (lat < s || lat > n || lng < w || lng > e) return false
  return pointInPolygons(pos, POLYGONS)
}

/** Contorno do município como listas de [lat, lng], para desenhar no mapa. */
export function areaOutline(): LatLng[][] {
  return POLYGONS.map(([outer]) => outer.map(([lng, lat]) => [lat, lng] as LatLng))
}
