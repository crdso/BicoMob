import { fetchWithTimeout, throttled, TtlCache } from './net'
import { haversineKm, isValidPosition, normalize, type IconKey, type LatLng, type Place } from './places'

/* ---------------------------------------------------------------------------------------------
 * Busca de endereços e lugares (dados do OpenStreetMap), em qualquer cidade.
 *
 *  - AUTOCOMPLETE (a cada digitação, com debounce na tela): somente o Photon (komoot), feito para
 *    busca-enquanto-digita, com viés de localização (`lat`/`lon`) que prioriza o que está perto sem
 *    impedir outras cidades. Se falhar ou demorar, a interface informa e oferece escolher no mapa
 *    ou uma busca explícita. NÃO há fallback automático para outro serviço.
 *    O endereço do Photon pode ser trocado por uma instância própria com `VITE_PHOTON_URL`.
 *  - Nominatim público: NUNCA no autocomplete (a política de uso proíbe). Só em consultas
 *    explícitas e pontuais — o usuário toca em "Buscar no OpenStreetMap" ou pressiona Enter —,
 *    com no mínimo 3 letras, limite global de 1 req/s (compartilhado com a geocodificação
 *    reversa), cache e sem repetir a mesma consulta. O navegador identifica o app pelo Referer.
 *
 * Debounce e cancelamento ficam na tela; aqui há cache, limites, timeouts curtos e ordenação.
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

/* ------------------------------ Ícones por categoria ------------------------------ */

export function iconForOsm(key?: string, value?: string): IconKey {
  const k = key ?? ''
  const v = value ?? ''
  if (k === 'highway') return 'cat-street'
  if (k === 'place') return ['suburb', 'neighbourhood', 'quarter', 'city_block', 'borough'].includes(v) ? 'cat-neighborhood' : 'pin-fill'
  if (k === 'amenity') {
    if (['university', 'college'].includes(v)) return 'cat-graduation'
    if (['school', 'kindergarten', 'library', 'language_school'].includes(v)) return 'cat-school'
    if (['hospital', 'clinic', 'doctors', 'dentist'].includes(v)) return 'cat-hospital'
    if (v === 'pharmacy') return 'cat-pharmacy'
    if (v === 'place_of_worship') return 'cat-church'
    if (['townhall', 'courthouse', 'police', 'fire_station', 'post_office', 'community_centre', 'public_building'].includes(v)) return 'cat-government'
    if (['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'ice_cream', 'food_court'].includes(v)) return 'cat-food'
    if (v === 'fuel') return 'cat-fuel'
    if (['bank', 'atm'].includes(v)) return 'cat-bank'
    if (['bus_station', 'taxi', 'ferry_terminal'].includes(v)) return 'cat-transport'
    if (v === 'marketplace') return 'cat-market'
    return 'cat-building'
  }
  if (k === 'healthcare') return v === 'pharmacy' ? 'cat-pharmacy' : 'cat-hospital'
  if (k === 'shop') return ['supermarket', 'convenience', 'greengrocer', 'butcher', 'bakery', 'mall'].includes(v) ? 'cat-market' : 'cat-shop'
  if (k === 'craft') return v === 'bakery' ? 'cat-market' : 'cat-shop'
  if (k === 'leisure') return ['pitch', 'sports_centre', 'stadium', 'fitness_centre'].includes(v) ? 'cat-sports' : 'cat-park'
  if (k === 'tourism') return ['hotel', 'guest_house', 'motel', 'hostel'].includes(v) ? 'cat-hotel' : 'pin-fill'
  if (k === 'railway' || k === 'public_transport') return 'cat-transport'
  if (k === 'office') return 'cat-government'
  if (k === 'building') return 'cat-building'
  return 'pin-fill'
}

/** Nome em português do tipo OSM, para locais que existem no mapa mas não têm nome cadastrado. */
export function typeLabel(key?: string, value?: string): string | undefined {
  const v = value ?? ''
  if (key === 'amenity') {
    if (v === 'pharmacy') return 'Farmácia'
    if (['hospital', 'clinic', 'doctors'].includes(v)) return 'Unidade de saúde'
    if (['school', 'kindergarten'].includes(v)) return 'Escola'
    if (v === 'place_of_worship') return 'Igreja'
    if (v === 'fuel') return 'Posto de combustível'
    if (v === 'bank') return 'Banco'
  }
  if (key === 'shop') return ['supermarket', 'convenience'].includes(v) ? 'Mercado' : 'Loja'
  return undefined
}

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
  const place = p.city ?? p.county
  // Para ruas, o próprio nome já é o título: não repete a rua no endereço.
  const subtitle = uniq([p.name && road ? road : undefined, p.district ?? p.locality, place, p.state, p.countrycode && p.countrycode !== 'BR' ? p.country : undefined])
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
  const subtitle = uniq([named || kind ? road : undefined, a.suburb ?? a.neighbourhood, city, a.state, a.country_code && a.country_code !== 'br' ? a.country : undefined])
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

/** Une fontes sem duplicar (mesmo id, ou mesmo nome a < 60 m) e ordena por relevância e proximidade. */
export function mergePlaces(lists: Place[][], q: string, bias?: LatLng): Place[] {
  const nq = normalize(q)
  const out: Place[] = []
  for (const list of lists) {
    for (const p of list) {
      // Duplicado: mesmo id, mesmo nome muito próximo, ou trechos da mesma rua (mesmo nome e mesmo endereço, a < 3 km).
      const dup = out.some((o) => {
        if (o.id === p.id) return true
        const sameName = normalize(o.title) === normalize(p.title)
        if (!sameName) return false
        const d = haversineKm(o.position, p.position)
        return d < 0.06 || (normalize(o.subtitle) === normalize(p.subtitle) && d < 3)
      })
      if (!dup) out.push(p)
    }
  }
  const order = new Map(out.map((p, i) => [p.id, i]))
  const key = (p: Place) => textRank(p.title, nq) * 1e6 + (bias ? Math.min(haversineKm(bias, p.position), 9999) * 100 : 0) + (order.get(p.id) ?? 0) / 1000
  return out.sort((a, b) => key(a) - key(b))
}

/* ------------------------------ Provedores ------------------------------ */

async function photon(q: string, bias: LatLng | undefined, signal?: AbortSignal): Promise<Place[]> {
  await throttled('photon', 250, signal)
  const params = new URLSearchParams({ q, limit: '12' })
  // Privacidade: o viés de proximidade é enviado arredondado (~1 km), nunca a posição exata.
  if (bias) { params.set('lat', bias[0].toFixed(2)); params.set('lon', bias[1].toFixed(2)); params.set('location_bias_scale', '0.5') }
  const res = await fetchWithTimeout(`${PHOTON}?${params}`, {}, PHOTON_TIMEOUT_MS, signal)
  if (!res.ok) throw new Error('Photon HTTP ' + res.status)
  const j = (await res.json()) as { features?: PhotonFeature[] }
  if (!Array.isArray(j.features)) throw new Error('Photon: resposta inválida')
  return j.features.map(photonToPlace).filter((p): p is Place => !!p)
}

async function nominatimRequest(q: string, bias: LatLng | undefined, signal?: AbortSignal): Promise<Place[]> {
  // Mesmo limitador global da geocodificação reversa: no máximo 1 requisição por segundo no total.
  await throttled('nominatim', 1100, signal)
  const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '10', q })
  // `viewbox` sem `bounded` só dá preferência à região do usuário: outras cidades continuam acessíveis.
  if (bias) params.set('viewbox', `${bias[1] - 0.5},${bias[0] + 0.5},${bias[1] + 0.5},${bias[0] - 0.5}`)
  const lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'pt-BR'
  const res = await fetchWithTimeout(`${NOMINATIM}?${params}`, { headers: { 'Accept-Language': lang } }, NOMINATIM_TIMEOUT_MS, signal)
  if (!res.ok) throw new Error('Nominatim HTTP ' + res.status)
  const rows = (await res.json()) as NominatimRow[]
  if (!Array.isArray(rows)) throw new Error('Nominatim: resposta inválida')
  return rows.map(nominatimRowToPlace).filter((p): p is Place => !!p)
}

/* ------------------------------ Orquestração ------------------------------ */

const abortError = () => new DOMException('Aborted', 'AbortError')

/**
 * Autocomplete: consulta SOMENTE o Photon. Nunca chama o Nominatim.
 * Falhas e lentidão (timeout de 4,5 s) viram `sources.photon === 'error'`, para a tela avisar.
 */
export async function searchPlaces(
  q: string,
  opts: { bias?: LatLng; signal?: AbortSignal; onUpdate?: (o: SearchOutcome) => void } = {},
): Promise<SearchOutcome> {
  const nq = normalize(q)
  if (nq.length < MIN_CHARS) return { places: [], sources: { photon: 'skipped' } }

  const bias = opts.bias && isValidPosition(opts.bias) ? opts.bias : undefined
  const key = `${nq}|${bias ? `${bias[0].toFixed(1)},${bias[1].toFixed(1)}` : 'global'}`
  const hit = cache.get(key)
  if (hit) { opts.onUpdate?.(hit); return hit }

  let outcome: SearchOutcome
  try {
    const list = await photon(q, bias, opts.signal)
    outcome = { places: mergePlaces([list], q, bias).slice(0, MAX_RESULTS), sources: { photon: 'ok' } }
  } catch {
    outcome = { places: [], sources: { photon: 'error' } }
  }
  if (opts.signal?.aborted) throw abortError()
  opts.onUpdate?.(outcome)
  // Falhas não ficam em cache: a próxima tentativa consulta de novo.
  if (outcome.sources.photon === 'ok') cache.set(key, outcome)
  return outcome
}

/**
 * Busca EXPLÍCITA no Nominatim público (o usuário tocou no botão ou pressionou Enter).
 * Compatível com a política de uso: pontual, mín. 3 letras, 1 req/s global, cache e sem duplicar
 * uma consulta em andamento. Lança erro se o serviço falhar (a tela mostra a mensagem).
 */
export async function searchNominatim(q: string, opts: { bias?: LatLng; signal?: AbortSignal } = {}): Promise<Place[]> {
  const nq = normalize(q)
  if (nq.length < NOMINATIM_MIN_CHARS) return []
  const bias = opts.bias && isValidPosition(opts.bias) ? opts.bias : undefined
  const key = `${nq}|${bias ? `${bias[0].toFixed(1)},${bias[1].toFixed(1)}` : 'global'}`
  const hit = explicitCache.get(key)
  if (hit) return hit
  const running = explicitInFlight.get(key)
  if (running) return running
  const p = nominatimRequest(q, bias, opts.signal)
    .then((list) => { explicitCache.set(key, list); return mergePlaces([list], q, bias) })
    .finally(() => explicitInFlight.delete(key))
  explicitInFlight.set(key, p)
  return p
}

/** O Photon não respondeu (para mostrar "serviço indisponível" em vez de "sem resultados"). */
export function allSourcesFailed(o: SearchOutcome): boolean {
  return o.sources.photon === 'error'
}
