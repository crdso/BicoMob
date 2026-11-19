import type iconMap from '../icons/icon-map.json'

export type LatLng = [number, number]
export type IconKey = keyof typeof iconMap

export interface Place {
  id: string
  title: string
  /** Endereço secundário (rua, bairro, cidade, estado). */
  subtitle: string
  position: LatLng
  icon: IconKey
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Dois locais a menos de 30 m são tratados como o mesmo ponto. */
export function samePlace(a: Place, b: Place): boolean {
  return haversineKm(a.position, b.position) < 0.03
}

/** Coordenadas válidas (evita NaN e valores fora do globo). */
export function isValidPosition(p: LatLng): boolean {
  return Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180
}
