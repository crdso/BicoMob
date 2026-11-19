import { AREA_BBOX, AREA_CENTER, insideArea } from './boundary'
import { searchLocal } from './localIndex'
import { fetchWithTimeout, throttled, TtlCache } from './net'
import { iconForOsm, typeLabel } from './osm'
import { haversineKm, isValidPosition, normalize, type LatLng, type Place } from './places'

export { iconForOsm, typeLabel } from './osm'

/* ---------------------------------------------------------------------------------------------
 * Busca de endereços e lugares DENTRO do município da demonstração (dados do OpenStreetMap).
 *
 *  1. Índice local (src/data/places-index.json): ruas, bairros e lugares nomeados. Instantâneo e offline.
 *  2. Autocomplete online (Photon), restrito à caixa do município e com viés de proximidade. É o único
 *     serviço consultado enquanto o usuário digita.
 *  3. Nominatim público: apenas em consulta EXPLÍCITA (botão "Buscar endereço" ou Enter), pontual,
 *     com mínimo de 3 letras, limite global de 1 req/s, cache e sem duplicar consultas em andamento.
 *
 * Filtro geográfico real: TODO resultado, de qualquer fonte, é conferido pelas coordenadas contra o
 * polígono do município (insideArea). O que cair fora é descartado, mesmo que o provedor o devolva.
 * Nada é inventado: só aparece o que as fontes retornam.
 * ------------------------------------------------------------------------------------------- */

export type SourceStatus = 'pending' | 'ok' | 'error' | 'skipped'
export interface SearchOutcome {
  places: Place[]
  sources: { photon: SourceStatus }
}

const PHOTON = (import.meta.env?.VITE_PHOTON_URL as string | undefined) || 'https://photon.komoot.io/api/'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
export const PHOTON_TIMEOUT_MS = 4500
export const NOMINATIM_TIMEOUT_MS = 6500
export const NOMINATIM_MIN_CHARS = 3
export const MAX_RESULTS = 30
export const MIN_CHARS = 2

const cache = new TtlCache<SearchOutcome>(10 * 60 * 1000, 150)
const explicitCache = new TtlCache<Place[]>(30 * 60 * 1000, 60)
const explicitInFlight = new Map<string, Promise<Place[]>>()

/** Descarta o que estiver fora do município (validação por polígono, não por caixa). */
export const onlyInsideArea = (list: Place[]): Place[] => list.filter((p) => insideArea(p.position))

/* ------------------------------ Conversões ------------------------------ */

const uniq = (parts: (string | undefined)[]): string => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    if (!p) continue
    const k = normalize(p)
    if (!seen.has(k)) { seen.add(k); out.push(p) }
  }
  return out.join(', ')
}

export interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string; osm_id?: number; osm_key?: string; osm_value?: string
    name?: string; street?: string; housenumber?: string; district?: string; locality?: string
    city?: string; county?: string; state?: string; country?: string; countrycode?: string
  }
}

export function photonToPlace(f: PhotonFeature): Place | null {
  const p = f.properties
  const [lng, lat] = f.geometry?.coordinates ?? []
  if (!isValidPosition([lat, lng])) return null
  const road = p.street ? `${p.street}${p.housenumber ? ', ' + p.housenumber : ''}` : undefined
  const title = p.name ?? road
  if (!title) return null
  // Tudo está dentro do mesmo município: o endereço mostra rua e bairro (cidade só se não houver mais nada).
  const subtitle = uniq([p.name && road ? road : undefined, p.district ?? p.locality]) || p.city || ''
  return {
    id: `osm-${(p.osm_type ?? 'X').charAt(0).toUpperCase()}${p.osm_id ?? `${lat.toFixed(5)}_${lng.toFixed(5)}`}`,
    title,
    subtitle,
    position: [lat, lng],
    icon: iconForOsm(p.osm_key, p.osm_value),
  }
}

export interface NominatimRow {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  name?: string
  category?: string
  type?: string
  address?: Record<string, string>
  display_name: string
}

export function nominatimRowToPlace(r: NominatimRow): Place | null {
  const lat = parseFloat(r.lat)
  const lng = parseFloat(r.lon)
  if (!isValidPosition([lat, lng])) return null
  const a = r.address ?? {}
  const road = a.road ? `${a.road}${a.house_number ? ', ' + a.house_number : ''}` : undefined
  const kind = typeLabel(r.category, r.type)
  const named = r.name || undefined
  const title = named ?? (kind && road ? kind : road) ?? r.display_name.split(',')[0]
  const city = a.city ?? a.town ?? a.village ?? a.municipality
  const subtitle = uniq([named || kind ? road : undefined, a.suburb ?? a.neighbourhood]) || city || ''
  return { id: `osm-${r.osm_type[0].toUpperCase()}${r.osm_id}`, title, subtitle, position: [lat, lng], icon: iconForOsm(r.category, r.type) }
}

/* ------------------------------ Ordenação e união ------------------------------ */

function textRank(title: string, nq: string): number {
  const t = normalize(title)
  if (t === nq) return 0
  if (t.startsWith(nq)) return 1
  if (t.split(/[\s,]+/).some((w) => w.startsWith(nq))) return 2
  if (t.includes(nq)) return 3
  return 4
}

/** Une fontes sem duplicar (mesmo id, mesmo nome muito próximo, ou trechos da mesma rua) e ordena. */
export function mergePlaces(lists: Place[][], q: string, bias?: LatLng): Place[] {
  const nq = normalize(q)
  const out: Place[] = []
  for (const list of lists) {
    for (const p of list) {
      const dup = out.some((o) => {
        if (o.id === p.id) return true
        if (normalize(o.title) !== normalize(p.title)) return false
        const d = haversineKm(o.position, p.position)
        return d < 0.25 || (normalize(o.subtitle) === normalize(p.subtitle) && d < 3)
      })
      if (!dup) out.push(p)
    }
  }
  const order = new Map(out.map((p, i) => [p.id, i]))
  const key = (p: Place) => textRank(p.title, nq) * 1e6 + (bias ? Math.min(haversineKm(bias, p.position), 9999) * 100 : 0) + (order.get(p.id) ?? 0) / 1000
  return out.sort((a, b) => key(a) - key(b))
}

/* ------------------------------ Provedores ------------------------------ */

/** Viés de proximidade: a posição do usuário se ela estiver na área; senão, o centro da área. Arredondado (~1 km). */
function biasPoint(bias?: LatLng): LatLng {
  return bias && isValidPosition(bias) && insideArea(bias) ? bias : AREA_CENTER
}

async function photon(q: string, bias: LatLng | undefined, signal?: AbortSignal): Promise<Place[]> {
  await throttled('photon', 250, signal)
  const [s, w, n, e] = AREA_BBOX
  const b = biasPoint(bias)
  const params = new URLSearchParams({ q, limit: '15', bbox: `${w},${s},${e},${n}`, lat: b[0].toFixed(2), lon: b[1].toFixed(2), location_bias_scale: '0.5' })
  const res = await fetchWithTimeout(`${PHOTON}?${params}`, {}, PHOTON_TIMEOUT_MS, signal)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const j = (await res.json()) as { features?: PhotonFeature[] }
  if (!Array.isArray(j.features)) throw new Error('resposta inválida')
  return j.features.map(photonToPlace).filter((p): p is Place => !!p)
}

async function nominatimRequest(q: string, signal?: AbortSignal): Promise<Place[]> {
  // Mesmo limitador global da geocodificação reversa: no máximo 1 requisição por segundo no total.
  await throttled('nominatim', 1100, signal)
  const [s, w, n, e] = AREA_BBOX
  const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '15', countrycodes: 'br', bounded: '1', viewbox: `${w},${n},${e},${s}`, q })
  const lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'pt-BR'
  const res = await fetchWithTimeout(`${NOMINATIM}?${params}`, { headers: { 'Accept-Language': lang } }, NOMINATIM_TIMEOUT_MS, signal)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const rows = (await res.json()) as NominatimRow[]
  if (!Array.isArray(rows)) throw new Error('resposta inválida')
  return rows.map(nominatimRowToPlace).filter((p): p is Place => !!p)
}

/* ------------------------------ Orquestração ------------------------------ */

const abortError = () => new DOMException('Aborted', 'AbortError')

/**
 * Autocomplete: índice local (na hora) + Photon. Nunca chama o Nominatim.
 * Resultados externos ao município são descartados. Falhas e lentidão (timeout de 4,5 s) viram
 * `sources.photon === 'error'`; os resultados locais continuam disponíveis.
 */
export async function searchPlaces(
  q: string,
  opts: { bias?: LatLng; signal?: AbortSignal; onUpdate?: (o: SearchOutcome) => void } = {},
): Promise<SearchOutcome> {
  const nq = normalize(q)
  if (nq.length < MIN_CHARS) return { places: [], sources: { photon: 'skipped' } }

  const bias = opts.bias && isValidPosition(opts.bias) ? opts.bias : undefined
  const b = biasPoint(bias)
  const key = `${nq}|${b[0].toFixed(1)},${b[1].toFixed(1)}`
  const hit = cache.get(key)
  if (hit) { opts.onUpdate?.(hit); return hit }

  const local = onlyInsideArea(searchLocal(q))
  const partial: SearchOutcome = { places: mergePlaces([local], q, b).slice(0, MAX_RESULTS), sources: { photon: 'pending' } }
  if (!opts.signal?.aborted) opts.onUpdate?.(partial)

  let online: Place[] = []
  let status: SourceStatus = 'ok'
  try {
    online = onlyInsideArea(await photon(q, bias, opts.signal))
  } catch {
    status = 'error'
  }
  if (opts.signal?.aborted) throw abortError()

  const outcome: SearchOutcome = { places: mergePlaces([local, online], q, b).slice(0, MAX_RESULTS), sources: { photon: status } }
  opts.onUpdate?.(outcome)
  // Falhas não ficam em cache: a próxima tentativa consulta de novo.
  if (status === 'ok') cache.set(key, outcome)
  return outcome
}

/**
 * Busca EXPLÍCITA (o usuário tocou em "Buscar endereço" ou pressionou Enter) no serviço público de
 * geocodificação. Pontual, mín. 3 letras, 1 req/s global, cache e sem duplicar consulta em andamento.
 * Só devolve o que está dentro do município. Lança erro se o serviço falhar.
 */
export async function searchNominatim(q: string, opts: { bias?: LatLng; signal?: AbortSignal } = {}): Promise<Place[]> {
  const nq = normalize(q)
  if (nq.length < NOMINATIM_MIN_CHARS) return []
  const b = biasPoint(opts.bias)
  const key = nq
  const hit = explicitCache.get(key)
  if (hit) return mergePlaces([hit], q, b)
  const running = explicitInFlight.get(key)
  if (running) return running
  const p = nominatimRequest(q, opts.signal)
    .then((list) => { const inside = onlyInsideArea(list); explicitCache.set(key, inside); return mergePlaces([inside], q, b) })
    .finally(() => explicitInFlight.delete(key))
  explicitInFlight.set(key, p)
  return p
}

/** Nenhum resultado e o serviço online falhou (para mostrar "indisponível" em vez de "sem resultados"). */
export function allSourcesFailed(o: SearchOutcome): boolean {
  return o.sources.photon === 'error' && o.places.length === 0
}
