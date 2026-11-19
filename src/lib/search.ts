import { getBoundary, insideMunicipio, MUNICIPIO_BBOX } from './boundary'
import { fetchWithTimeout, throttled, TtlCache } from './net'
import { ARAGUATINS_CENTER, haversineKm, normalize, type IconKey, type LatLng, type Place } from './places'

/* ---------------------------------------------------------------------------------------------
 * Pesquisa de locais em Araguatins - TO (dados do OpenStreetMap):
 *  - Photon (komoot): busca-enquanto-digita, feito para autocomplete. Viés de localização + bbox do município.
 *  - Overpass API: estabelecimentos/categorias (ex.: "farmácia", "escola") perto do centro. Melhor esforço:
 *    os servidores públicos têm limites e podem estar indisponíveis.
 *  - Nominatim público: SOMENTE em busca explícita (Enter/botão), pois a política proíbe autocomplete.
 * Tudo é filtrado pelo polígono municipal real. Nada é inventado: só exibimos o que as fontes retornam.
 * ------------------------------------------------------------------------------------------- */

export type SourceStatus = 'ok' | 'error' | 'skipped' | 'pending'
export interface SearchOutcome {
  places: Place[]
  sources: { photon: SourceStatus; overpass: SourceStatus; nominatim: SourceStatus }
}

const PHOTON = 'https://photon.komoot.io/api/'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const OVERPASS_RADIUS_M = 20000

const cache = new TtlCache<SearchOutcome>(10 * 60 * 1000, 150)

/* ------------------------------ Categorias ------------------------------ */

export function iconForOsm(key?: string, value?: string): IconKey {
  const k = key ?? ''
  const v = value ?? ''
  if (k === 'highway') return 'cat-street'
  if (k === 'place') return ['suburb', 'neighbourhood', 'quarter', 'city_block'].includes(v) ? 'cat-neighborhood' : 'pin-fill'
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
    if (['marketplace'].includes(v)) return 'cat-market'
    return 'cat-building'
  }
  if (k === 'healthcare') return v === 'pharmacy' ? 'cat-pharmacy' : 'cat-hospital'
  if (k === 'shop') return ['supermarket', 'convenience', 'greengrocer', 'butcher', 'bakery'].includes(v) ? 'cat-market' : 'cat-shop'
  if (k === 'leisure') return ['pitch', 'sports_centre', 'stadium', 'fitness_centre'].includes(v) ? 'cat-sports' : 'cat-park'
  if (k === 'tourism') return ['hotel', 'guest_house', 'motel', 'hostel'].includes(v) ? 'cat-hotel' : 'pin-fill'
  if (k === 'office') return 'cat-government'
  if (k === 'building') return 'cat-building'
  return 'pin-fill'
}

interface CategoryRule {
  re: RegExp
  /** Filtros Overpass para a categoria. */
  filters: string[]
  /** Nome em português para resultados sem nome no OSM (ex.: "Farmácia"). */
  label: string
  /** Frase em inglês que o Nominatim entende ("pharmacy in Araguatins"). */
  phrase: string
}
export const CATEGORY_RULES: CategoryRule[] = [
  { re: /\b(farmaci|drogar)/, filters: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]'], label: 'Farmácia', phrase: 'pharmacy' },
  { re: /\b(hospital|clinica|posto de saude|ubs|pronto.?socorro|upa)/, filters: ['["amenity"~"^(hospital|clinic|doctors)$"]', '["healthcare"~"^(hospital|clinic|centre)$"]'], label: 'Saúde', phrase: 'hospital' },
  { re: /\b(escola|colegio|creche)/, filters: ['["amenity"~"^(school|kindergarten)$"]'], label: 'Escola', phrase: 'school' },
  { re: /\b(faculdade|universidade|instituto)/, filters: ['["amenity"~"^(university|college)$"]'], label: 'Faculdade', phrase: 'university' },
  { re: /\b(mercado|supermercado|mercearia|mercadinho|atacado)/, filters: ['["shop"~"^(supermarket|convenience|greengrocer)$"]', '["amenity"="marketplace"]'], label: 'Mercado', phrase: 'supermarket' },
  { re: /\b(igreja|templo|capela|catedral)/, filters: ['["amenity"="place_of_worship"]'], label: 'Igreja', phrase: 'place of worship' },
  { re: /\b(praca|parque)/, filters: ['["leisure"~"^(park|garden|playground)$"]'], label: 'Praça', phrase: 'park' },
  { re: /\b(banco|caixa|loterica)/, filters: ['["amenity"="bank"]'], label: 'Banco', phrase: 'bank' },
  { re: /\b(posto|combustivel|gasolina)/, filters: ['["amenity"="fuel"]'], label: 'Posto de combustível', phrase: 'fuel' },
  { re: /\b(padaria|panificadora)/, filters: ['["shop"="bakery"]'], label: 'Padaria', phrase: 'bakery' },
  { re: /\b(restaurante|lanchonete|pizzaria|bar|cafe|sorveteria)/, filters: ['["amenity"~"^(restaurant|fast_food|cafe|bar|pub|ice_cream)$"]'], label: 'Restaurante', phrase: 'restaurant' },
  { re: /\b(hotel|pousada|hospedagem)/, filters: ['["tourism"~"^(hotel|guest_house|motel|hostel)$"]'], label: 'Hospedagem', phrase: 'hotel' },
  { re: /\b(prefeitura|camara|forum|delegacia|policia|correios|bombeiro)/, filters: ['["amenity"~"^(townhall|courthouse|police|fire_station|post_office)$"]', '["office"="government"]'], label: 'Órgão público', phrase: 'townhall' },
  { re: /\b(rodoviaria|terminal|porto|balsa)/, filters: ['["amenity"~"^(bus_station|ferry_terminal)$"]'], label: 'Terminal', phrase: 'bus station' },
]

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

export function detectCategory(q: string): CategoryRule | null {
  const n = normalize(q)
  return CATEGORY_RULES.find((r) => r.re.test(n)) ?? null
}

/* ------------------------------ Conversões ------------------------------ */

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string; osm_id?: number; osm_key?: string; osm_value?: string
    name?: string; street?: string; housenumber?: string; district?: string; locality?: string
    city?: string; county?: string; state?: string
  }
}

const osmTypeLetter = (t?: string) => (t ?? '').charAt(0).toUpperCase()

export function photonToPlace(f: PhotonFeature): Place | null {
  const p = f.properties
  const [lng, lat] = f.geometry.coordinates
  const road = p.street ? `${p.street}${p.housenumber ? ', ' + p.housenumber : ''}` : undefined
  const title = p.name ?? road
  if (!title) return null
  const where = [p.name && road ? road : undefined, p.district ?? p.locality, 'Araguatins - TO'].filter(Boolean).join(', ')
  return {
    id: `osm-${osmTypeLetter(p.osm_type)}${p.osm_id}`,
    title,
    subtitle: where,
    position: [lat, lng],
    icon: iconForOsm(p.osm_key, p.osm_value),
  }
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function overpassToPlace(e: OverpassElement): Place | null {
  const t = e.tags
  const lat = e.lat ?? e.center?.lat
  const lon = e.lon ?? e.center?.lon
  if (!t?.name || lat == null || lon == null) return null
  const key = ['amenity', 'shop', 'leisure', 'tourism', 'office', 'healthcare', 'place', 'building'].find((k) => t[k])
  const road = t['addr:street'] ? `${t['addr:street']}${t['addr:housenumber'] ? ', ' + t['addr:housenumber'] : ''}` : undefined
  return {
    id: `osm-${e.type[0].toUpperCase()}${e.id}`,
    title: t.name,
    subtitle: [road, t['addr:suburb'] ?? t['addr:neighbourhood'], 'Araguatins - TO'].filter(Boolean).join(', '),
    position: [lat, lon],
    icon: iconForOsm(key, key ? t[key] : undefined),
  }
}

/* ------------------------------ Overpass ------------------------------ */

const ACCENTS: Record<string, string> = {
  a: '[aáàâãä]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]', n: '[nñ]',
}
/** Padrão de regex que ignora acentos (Overpass não normaliza acentos). */
export function accentPattern(q: string): string {
  return normalize(q)
    .replace(/[^a-z0-9 ]/g, '')
    .split('')
    .map((ch) => ACCENTS[ch] ?? ch)
    .join('')
}

export function buildOverpassQuery(q: string, center: LatLng, category: CategoryRule | null): string {
  const around = `(around:${OVERPASS_RADIUS_M},${center[0].toFixed(5)},${center[1].toFixed(5)})`
  const parts: string[] = []
  const pat = accentPattern(q)
  if (category) for (const f of category.filters) parts.push(`nwr${f}${around};`)
  if (pat.length >= 3) {
    for (const k of ['amenity', 'shop', 'leisure', 'tourism', 'office', 'healthcare', 'place']) {
      parts.push(`nwr["name"~"${pat}",i]["${k}"]${around};`)
    }
  }
  return `[out:json][timeout:12];(${parts.join('')});out tags center 40;`
}

/** Consulta os espelhos públicos em paralelo e usa o primeiro que responder com JSON válido. */
async function overpass(query: string, signal?: AbortSignal): Promise<OverpassElement[]> {
  await throttled('overpass', 1500, signal)
  const one = async (url: string) => {
    const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) }, 7000, signal)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const j = (await res.json()) as { elements?: OverpassElement[] }
    if (!Array.isArray(j.elements)) throw new Error('resposta inválida')
    return j.elements
  }
  try {
    return await Promise.any(OVERPASS_MIRRORS.map(one))
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    throw err
  }
}

/* ------------------------------ Photon ------------------------------ */

async function photon(q: string, near: LatLng, signal?: AbortSignal): Promise<Place[]> {
  await throttled('photon', 450, signal)
  const [s, w, n, e] = getBoundary()?.bbox ?? MUNICIPIO_BBOX
  const url = `${PHOTON}?q=${encodeURIComponent(q)}&lat=${near[0]}&lon=${near[1]}&limit=15&bbox=${w},${s},${e},${n}`
  const res = await fetchWithTimeout(url, {}, 8000, signal)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const j = (await res.json()) as { features: PhotonFeature[] }
  return j.features.map(photonToPlace).filter((p): p is Place => !!p)
}

/* ------------------------------ Nominatim (busca explícita) ------------------------------ */

export interface NominatimRow { osm_type: string; osm_id: number; lat: string; lon: string; name?: string; category?: string; type?: string; address?: Record<string, string>; display_name: string }

async function nominatimQuery(text: string, signal?: AbortSignal): Promise<NominatimRow[]> {
  await throttled('nominatim', 1100, signal)
  const [s, w, n, e] = getBoundary()?.bbox ?? MUNICIPIO_BBOX
  const url = `${NOMINATIM}?format=jsonv2&addressdetails=1&limit=12&countrycodes=br&bounded=1&viewbox=${w},${n},${e},${s}&q=${encodeURIComponent(text)}`
  const res = await fetchWithTimeout(url, { headers: { 'Accept-Language': 'pt-BR' } }, 9000, signal)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return (await res.json()) as NominatimRow[]
}

export function nominatimRowToPlace(r: NominatimRow): Place {
  const a = r.address ?? {}
  const road = a.road ? `${a.road}${a.house_number ? ', ' + a.house_number : ''}` : undefined
  const kind = typeLabel(r.category, r.type)
  const named = r.name || undefined
  return {
    id: `osm-${r.osm_type[0].toUpperCase()}${r.osm_id}`,
    // Sem nome no OSM: usa o tipo (ex.: "Farmácia") e deixa a rua no endereço. Nada é inventado.
    title: named ?? (kind && road ? kind : road) ?? r.display_name.split(',')[0],
    subtitle: [named || kind ? road : undefined, a.suburb ?? a.neighbourhood, 'Araguatins - TO'].filter(Boolean).join(', '),
    position: [parseFloat(r.lat), parseFloat(r.lon)],
    icon: iconForOsm(r.category, r.type),
  }
}

/** Busca explícita (botão/Enter). Para categorias usa também a frase em inglês que o Nominatim entende. */
export async function searchNominatim(q: string, signal?: AbortSignal): Promise<Place[]> {
  const cat = detectCategory(q)
  const texts = cat ? [`${cat.phrase} in Araguatins`, `${q} Araguatins`] : [`${q} Araguatins`]
  const rows: NominatimRow[] = []
  for (const t of texts) rows.push(...(await nominatimQuery(t, signal)))
  return rows.map(nominatimRowToPlace).filter((p) => insideMunicipio(p.position))
}

/* ------------------------------ Orquestração ------------------------------ */

/** Une resultados, remove duplicados (mesmo id OSM, ou mesmo nome a < 60 m) e ordena por relevância. */
export function mergePlaces(lists: Place[][], q: string, near: LatLng): Place[] {
  const nq = normalize(q)
  const out: Place[] = []
  for (const list of lists) {
    for (const p of list) {
      const dup = out.some((o) => o.id === p.id || (normalize(o.title) === normalize(p.title) && haversineKm(o.position, p.position) < 0.06))
      if (!dup) out.push(p)
    }
  }
  const rank = (p: Place) => {
    const t = normalize(p.title)
    return (t === nq ? 0 : t.startsWith(nq) ? 1 : t.split(' ').some((w) => w.startsWith(nq)) ? 2 : t.includes(nq) ? 3 : 4) * 1000 + haversineKm(near, p.position)
  }
  return out.sort((a, b) => rank(a) - rank(b))
}

/**
 * Busca em Araguatins. As fontes rodam em paralelo e `onUpdate` é chamado a cada fonte que responde:
 * os resultados do Photon aparecem assim que chegam, sem esperar o Overpass (mais lento/instável).
 */
export async function searchPlaces(
  q: string,
  opts: { near?: LatLng; signal?: AbortSignal; onUpdate?: (o: SearchOutcome) => void } = {},
): Promise<SearchOutcome> {
  const near = opts.near ?? ARAGUATINS_CENTER
  const key = `${normalize(q)}|${near[0].toFixed(2)},${near[1].toFixed(2)}`
  const hit = cache.get(key)
  if (hit) { opts.onUpdate?.(hit); return hit }

  const category = detectCategory(q)
  const useOverpass = !!category || normalize(q).length >= 3
  const sources: SearchOutcome['sources'] = { photon: 'pending', overpass: useOverpass ? 'pending' : 'skipped', nominatim: 'skipped' }
  const inside = (p: Place) => insideMunicipio(p.position)
  let ph: Place[] = []
  let ov: Place[] = []
  const snapshot = (): SearchOutcome => ({ places: mergePlaces([ph, ov], q, near).slice(0, 30), sources: { ...sources } })
  const rethrowAbort = (err: unknown) => { if ((err as Error).name === 'AbortError' && opts.signal?.aborted) throw err }

  await Promise.all([
    photon(q, near, opts.signal)
      .then((list) => { ph = list.filter(inside); sources.photon = 'ok' })
      .catch((err) => { rethrowAbort(err); sources.photon = 'error' })
      .then(() => opts.onUpdate?.(snapshot())),
    useOverpass
      ? overpass(buildOverpassQuery(q, ARAGUATINS_CENTER, category), opts.signal)
          .then((els) => { ov = els.map(overpassToPlace).filter((p): p is Place => !!p).filter(inside); sources.overpass = 'ok' })
          .catch((err) => { rethrowAbort(err); sources.overpass = 'error' })
          .then(() => opts.onUpdate?.(snapshot()))
      : Promise.resolve(),
  ])

  const outcome = snapshot()
  // Não guarda no cache respostas vazias causadas por falha das fontes.
  if (outcome.places.length || (sources.photon === 'ok' && sources.overpass !== 'error')) cache.set(key, outcome)
  return outcome
}
