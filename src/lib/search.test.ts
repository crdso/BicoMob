import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AREA_BBOX, AREA_CENTER, insideArea } from './boundary'
import type { Place } from './places'
import {
  allSourcesFailed, iconForOsm, mergePlaces, nominatimRowToPlace, onlyInsideArea, photonToPlace, PHOTON_TIMEOUT_MS, searchNominatim, searchPlaces, typeLabel,
  type NominatimRow, type PhotonFeature, type SearchOutcome,
} from './search'

// Coordenadas de teste
const INSIDE = { centro: [-48.1162, -5.6529], escola: [-48.1105, -5.6511], ifto: [-48.0715, -5.6452] } as const
const OUTSIDE = { saoPaulo: [-46.6559, -23.5614], augustinopolis: [-47.8838, -5.4695], imperatriz: [-47.4917, -5.5265], palmas: [-48.3336, -10.1844] } as const

const feature = (name: string, [lon, lat]: readonly [number, number], extra: Partial<PhotonFeature['properties']> = {}): PhotonFeature => ({
  geometry: { coordinates: [lon, lat] },
  properties: { osm_type: 'W', osm_id: Math.round(Math.abs(lon * lat) * 1000), osm_key: 'highway', osm_value: 'residential', name, ...extra },
})
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
const fail = () => Promise.reject(new TypeError('Failed to fetch'))

let calls: string[] = []
function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  calls = []
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => { calls.push(url); return handler(url, init) })
}
const nominatimCalls = () => calls.filter((u) => u.includes('nominatim'))
beforeEach(() => { calls = [] })
afterEach(() => { vi.unstubAllGlobals() })

describe('conversão de resultados', () => {
  it('rua: o nome é o título e o endereço mostra o bairro (sem repetir cidade/estado)', () => {
    const p = photonToPlace(feature('Rua Exemplo', INSIDE.centro, { district: 'Centro', city: 'Araguatins', state: 'Tocantins' }))!
    expect(p.title).toBe('Rua Exemplo')
    expect(p.subtitle).toBe('Centro')
    expect(p.icon).toBe('cat-street')
  })
  it('estabelecimento: mostra a rua com número e o bairro', () => {
    const p = photonToPlace(feature('Mercado Central', INSIDE.escola, { osm_key: 'shop', osm_value: 'supermarket', street: 'Rua Bahia', housenumber: '120', district: 'Vila Madalena' }))!
    expect(p.subtitle).toBe('Rua Bahia, 120, Vila Madalena')
    expect(p.icon).toBe('cat-market')
  })
  it('endereço completo (sem nome): rua e número viram o título', () => {
    const p = photonToPlace(feature(undefined as unknown as string, INSIDE.centro, { name: undefined, street: 'Rua 7', housenumber: '15', osm_key: 'place', osm_value: 'house' }))!
    expect(p.title).toBe('Rua 7, 15')
  })
  it('descarta feições sem nome ou com coordenadas inválidas', () => {
    expect(photonToPlace({ geometry: { coordinates: [0, 0] }, properties: {} })).toBeNull()
    expect(photonToPlace({ geometry: { coordinates: [200, 0] }, properties: { name: 'x' } })).toBeNull()
  })
  it('Nominatim: rotula locais sem nome pelo tipo e mantém a rua', () => {
    const row: NominatimRow = { osm_type: 'node', osm_id: 7, lat: '-5.65', lon: '-48.11', category: 'amenity', type: 'pharmacy', address: { road: 'Avenida Exemplo', suburb: 'Centro', city: 'Araguatins' }, display_name: 'x' }
    expect(nominatimRowToPlace(row)).toMatchObject({ id: 'osm-N7', title: 'Farmácia', subtitle: 'Avenida Exemplo, Centro', icon: 'cat-pharmacy' })
  })
  it('categorias e rótulos', () => {
    expect(iconForOsm('amenity', 'hospital')).toBe('cat-hospital')
    expect(iconForOsm('amenity', 'university')).toBe('cat-graduation')
    expect(iconForOsm('shop', 'supermarket')).toBe('cat-market')
    expect(iconForOsm('leisure', 'park')).toBe('cat-park')
    expect(typeLabel('amenity', 'bank')).toBe('Banco')
    expect(typeLabel('highway', 'residential')).toBeUndefined()
  })
})

describe('ordenação e união', () => {
  const mk = (id: string, title: string, subtitle: string, lat: number, lon: number): Place => ({ id, title, subtitle, position: [lat, lon], icon: 'pin-fill' })
  it('relevância do texto vem antes da distância', () => {
    const exact = mk('a', 'Avenida Teste', '', -5.66, -48.1)
    const partial = mk('b', 'Posto Teste', '', -5.6529, -48.1162)
    expect(mergePlaces([[partial, exact]], 'avenida teste', AREA_CENTER)[0].id).toBe('a')
  })
  it('prioriza o que está perto do usuário', () => {
    const perto = mk('p', 'Rua Igual', 'A', -5.653, -48.116)
    const longe = mk('l', 'Rua Igual', 'B', -5.62, -48.06)
    expect(mergePlaces([[longe, perto]], 'rua igual', [-5.6529, -48.1162]).map((p) => p.id)).toEqual(['p', 'l'])
  })
  it('colapsa trechos da mesma rua e mantém bairros diferentes', () => {
    const out = mergePlaces([[mk('a', 'Rua X', 'Centro', -5.653, -48.116), mk('b', 'Rua X', 'Centro', -5.655, -48.118), mk('c', 'Rua X', 'Vila Madalena', -5.64, -48.1)]], 'rua x')
    expect(out.map((p) => p.id)).toEqual(['a', 'c'])
  })
  it('remove duplicados entre fontes (índice local e busca online)', () => {
    const local = mk('idx-1', 'Escola Daniel Berg', 'Centro', -5.6511, -48.1105)
    const online = mk('osm-W9', 'Escola Daniel Berg', 'Rua 13 de Outubro', -5.65115, -48.11052)
    expect(mergePlaces([[local], [online]], 'escola')).toHaveLength(1)
  })
})

describe('filtro geográfico dos resultados', () => {
  const place = (id: string, [lon, lat]: readonly [number, number]): Place => ({ id, title: id, subtitle: '', position: [lat, lon], icon: 'pin-fill' })
  it('descarta tudo o que está fora do município, mesmo que o provedor devolva', () => {
    const all = [place('centro', INSIDE.centro), place('sp', OUTSIDE.saoPaulo), place('aug', OUTSIDE.augustinopolis), place('imp', OUTSIDE.imperatriz), place('palmas', OUTSIDE.palmas), place('ifto', INSIDE.ifto)]
    expect(onlyInsideArea(all).map((p) => p.id)).toEqual(['centro', 'ifto'])
  })
})

describe('autocomplete: índice local + Photon restrito à área (nunca Nominatim)', () => {
  it('envia ao Photon a caixa do município e um viés dentro da área', async () => {
    mockFetch(() => ok({ features: [feature('Rua Teste Um', INSIDE.centro)] }))
    await searchPlaces('rua teste um')
    const u = new URL(calls[0])
    const [s, w, n, e] = AREA_BBOX
    expect(u.host).toBe('photon.komoot.io')
    expect(u.searchParams.get('bbox')).toBe(`${w},${s},${e},${n}`)
    expect(Number(u.searchParams.get('lat'))).toBeCloseTo(AREA_CENTER[0], 1)
    expect(Number(u.searchParams.get('lon'))).toBeCloseTo(AREA_CENTER[1], 1)
  })

  it('usa a posição do usuário como viés (arredondada) só quando está dentro da área; fora dela usa o centro', async () => {
    mockFetch(() => ok({ features: [] }))
    await searchPlaces('rua viés dois', { bias: [-5.64812, -48.07951] })
    expect(new URL(calls[0]).searchParams.get('lat')).toBe('-5.65')
    expect(new URL(calls[0]).searchParams.get('lon')).toBe('-48.08')
    await searchPlaces('rua viés três', { bias: [-23.5614, -46.6559] }) // usuário em outra cidade
    expect(Number(new URL(calls[1]).searchParams.get('lat'))).toBeCloseTo(AREA_CENTER[0], 1)
  })

  it('descarta resultados de outras cidades devolvidos pelo Photon', async () => {
    mockFetch(() => ok({ features: [
      feature('Rua das Castanheiras', OUTSIDE.saoPaulo, { city: 'São Paulo' }),
      feature('Rua das Castanheiras', OUTSIDE.augustinopolis, { city: 'Augustinópolis' }),
      feature('Rua das Castanheiras', OUTSIDE.imperatriz, { city: 'Imperatriz' }),
      feature('Rua das Castanheiras', OUTSIDE.palmas, { city: 'Palmas' }),
      feature('Rua das Castanheiras', INSIDE.escola, { district: 'Centro' }),
    ] }))
    const out = await searchPlaces('rua das castanheiras')
    expect(out.places).toHaveLength(1)
    expect(out.places.every((p) => insideArea(p.position))).toBe(true)
  })

  it('se TODOS os resultados do provedor forem externos, não sobra nenhum (e não é falha)', async () => {
    mockFetch(() => ok({ features: [feature('Rua Exclusiva Quatro', OUTSIDE.saoPaulo), feature('Rua Exclusiva Quatro', OUTSIDE.palmas)] }))
    const out = await searchPlaces('rua exclusiva quatro')
    expect(out.places).toEqual([])
    expect(allSourcesFailed(out)).toBe(false)
  })

  it('o índice local responde ANTES do Photon (mesmo com o Photon pendente)', async () => {
    mockFetch(() => new Promise(() => { /* nunca responde */ }))
    const updates: SearchOutcome[] = []
    const ctrl = new AbortController()
    const p = searchPlaces('ifto', { signal: ctrl.signal, onUpdate: (o) => updates.push(o) })
    await Promise.resolve()
    expect(updates[0].sources.photon).toBe('pending')
    expect(updates[0].places[0].title).toMatch(/Instituto Federal/)
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('se o Photon falhar, os resultados locais continuam e não aparece "indisponível"', async () => {
    mockFetch(() => fail())
    const out = await searchPlaces('avenida dom orione')
    expect(out.sources.photon).toBe('error')
    expect(out.places[0].title).toBe('Avenida Dom Orione')
    expect(allSourcesFailed(out)).toBe(false)
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('sem nada local e com o Photon fora do ar: informa a falha e não guarda em cache', async () => {
    mockFetch(() => fail())
    const out = await searchPlaces('xqzwvk indisponivel cinco')
    expect(allSourcesFailed(out)).toBe(true)
    const before = calls.length
    await searchPlaces('xqzwvk indisponivel cinco')
    expect(calls.length).toBeGreaterThan(before)
  })

  it('HTTP de erro (429/503) vira falha, sem fallback automático', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 429, json: async () => ({}) } as Response))
    const out = await searchPlaces('xqzwvk limitada seis')
    expect(out.sources.photon).toBe('error')
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('digitar muitas consultas seguidas nunca aciona o Nominatim; o cache evita repetir', async () => {
    mockFetch(() => ok({ features: [] }))
    for (const q of ['ru', 'rua', 'rua s', 'rua so', 'rua sao', 'rua sao jose']) await searchPlaces(q)
    expect(nominatimCalls()).toHaveLength(0)
    const n = calls.length
    await searchPlaces('rua sao jose')
    expect(calls.length).toBe(n)
  })

  it('não consulta nada com menos de 2 letras', async () => {
    mockFetch(() => ok({ features: [] }))
    expect((await searchPlaces('a')).places).toEqual([])
    expect(calls).toHaveLength(0)
  })
})

describe('lentidão do provedor', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('Photon que nunca responde: falha em ~4,5 s, os resultados locais permanecem e não há fallback', async () => {
    mockFetch((_url, init) => new Promise((_res, rej) => { init?.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError'))) }))
    const t0 = Date.now()
    const p = searchPlaces('escola')
    await vi.advanceTimersByTimeAsync(PHOTON_TIMEOUT_MS + 600)
    const out = await p
    expect(out.sources.photon).toBe('error')
    expect(Date.now() - t0).toBeLessThan(PHOTON_TIMEOUT_MS + 1000)
    expect(out.places.length).toBeGreaterThan(0) // escolas do índice local
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('Photon lento porém dentro do limite ainda devolve resultados', async () => {
    mockFetch(() => new Promise((res) => setTimeout(() => res({ ok: true, status: 200, json: async () => ({ features: [feature('Rua Lenta Nove', INSIDE.centro)] }) } as Response), 3000)))
    const p = searchPlaces('rua lenta nove')
    await vi.advanceTimersByTimeAsync(4200)
    expect((await p).places.some((x) => x.title === 'Rua Lenta Nove')).toBe(true)
  })
})

describe('busca explícita (política de uso do serviço público)', () => {
  const row = (id: number, name: string, lat: string, lon: string): NominatimRow => ({ osm_type: 'way', osm_id: id, lat, lon, name, category: 'highway', type: 'residential', address: { suburb: 'Centro' }, display_name: name })

  it('não consulta com menos de 3 letras', async () => {
    mockFetch(() => ok([]))
    expect(await searchNominatim('ab')).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('restringe à área (viewbox + bounded), descarta externos, converte e guarda em cache', async () => {
    mockFetch(() => ok([row(1, 'Rua Explicita Dez', '-5.653', '-48.116'), row(2, 'Rua Explicita Dez', '-23.56', '-46.65'), row(3, 'Rua Explicita Dez', '-5.47', '-47.88')]))
    const r = await searchNominatim('rua explicita dez')
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Rua Explicita Dez')
    const u = new URL(calls[0])
    expect(u.searchParams.get('bounded')).toBe('1')
    expect(u.searchParams.get('viewbox')).toBeTruthy()
    await searchNominatim('rua explicita dez')
    expect(calls).toHaveLength(1)
  })

  it('consultas iguais simultâneas viram uma só requisição', async () => {
    mockFetch(() => ok([row(4, 'Rua Dupla Onze', '-5.653', '-48.116')]))
    await Promise.all([searchNominatim('rua dupla onze'), searchNominatim('rua dupla onze'), searchNominatim('rua dupla onze')])
    expect(calls).toHaveLength(1)
  })

  it('respeita o limite global de 1 requisição por segundo', async () => {
    vi.useFakeTimers()
    try {
      const stamps: number[] = []
      mockFetch(() => { stamps.push(Date.now()); return ok([row(5, 'Rua Limite', '-5.653', '-48.116')]) })
      const ps = ['rua limite doze', 'rua limite treze', 'rua limite catorze'].map((q) => searchNominatim(q))
      await vi.advanceTimersByTimeAsync(5000)
      await Promise.all(ps)
      expect(stamps).toHaveLength(3)
      expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(1100)
      expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(1100)
    } finally { vi.useRealTimers() }
  })

  it('falha do serviço é propagada para a tela avisar o usuário', async () => {
    mockFetch(() => fail())
    await expect(searchNominatim('rua falha quinze')).rejects.toBeTruthy()
  })
})
