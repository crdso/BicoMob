export type LatLng = [number, number]

export interface Place {
  id: string
  title: string
  subtitle: string
  position: LatLng
  icon: 'house' | 'graduation' | 'pin' | 'hospital' | 'park'
  curated?: boolean
}

export const ARAGUATINS_CENTER: LatLng = [-5.6529, -48.1162]
export const IFTO_POSITION: LatLng = [-5.64520829, -48.07150463]
export const IFTO_RADIUS_M = 500

// Limite visual/aproximado da demo (NÃO é a fronteira municipal oficial).
export const DEMO_BOUNDS: [LatLng, LatLng] = [
  [-5.74, -48.16],
  [-5.56, -48.0],
]

export function inDemoBounds([lat, lng]: LatLng): boolean {
  const [[s, w], [n, e]] = DEMO_BOUNDS
  return lat >= s && lat <= n && lng >= w && lng <= e
}

export const CENTRO: Place = {
  id: 'centro',
  title: 'Centro de Araguatins',
  subtitle: 'Centro, Araguatins - TO',
  position: ARAGUATINS_CENTER,
  icon: 'house',
  curated: true,
}

export const IFTO: Place = {
  id: 'ifto-araguatins',
  title: 'IFTO Campus Araguatins',
  subtitle: 'Povoado Santa Teresa, Km 05, Zona Rural, Araguatins - TO',
  position: IFTO_POSITION,
  icon: 'graduation',
  curated: true,
}

// Coordenadas conferidas no OpenStreetMap (Nominatim) para Araguatins - TO.
export const HOSPITAL: Place = {
  id: 'hospital-municipal',
  title: 'Hospital Municipal de Araguatins',
  subtitle: 'Rua Bartolomeu Bueno da Silva, Centro, Araguatins - TO',
  position: [-5.6483903, -48.1203369],
  icon: 'hospital',
  curated: true,
}

export const PRACA: Place = {
  id: 'praca-ancelmo',
  title: 'Praça Ancelmo Ferreira Guimarães',
  subtitle: 'Centro, Araguatins - TO',
  position: [-5.6493276, -48.1230806],
  icon: 'park',
  curated: true,
}

export const CURATED_PLACES: Place[] = [CENTRO, IFTO, HOSPITAL, PRACA]

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function searchCurated(q: string): Place[] {
  const n = normalize(q)
  if (!n) return CURATED_PLACES
  return CURATED_PLACES.filter((p) => normalize(`${p.title} ${p.subtitle}`).includes(n))
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function isIftoPlace(p: Place): boolean {
  return p.id === IFTO.id || haversineKm(p.position, IFTO_POSITION) * 1000 <= IFTO_RADIUS_M
}

/** Suplemento aplicado uma única vez se origem OU destino estiver na zona IFTO. */
export function isIftoZone(origin: Place, dest: Place): boolean {
  return isIftoPlace(origin) || isIftoPlace(dest)
}
