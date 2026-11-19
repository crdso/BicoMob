import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Place } from './places'
import {
  allSourcesFailed, iconForOsm, mergePlaces, nominatimRowToPlace, photonToPlace, PHOTON_TIMEOUT_MS, searchNominatim, searchPlaces, typeLabel,
  type NominatimRow, type PhotonFeature,
} from './search'

const feature = (name: string, city: string, state: string, lon: number, lat: number, extra: Partial<PhotonFeature['properties']> = {}): PhotonFeature => ({
  geometry: { coordinates: [lon, lat] },
  properties: { osm_type: 'W', osm_id: Math.round(Math.abs(lon * lat) * 1000), osm_key: 'highway', osm_value: 'residential', name, city, state, countrycode: 'BR', ...extra },
})
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)
const fail = () => Promise.reject(new TypeError('Failed to fetch'))

let calls: string[] = []
function mockFetch(handler: (url: string) => Promise<Response>) {
  calls = []
  vi.stubGlobal('fetch', (url: string) => { calls.push(url); return handler(url) })
}
beforeEach(() => { calls = [] })
afterEach(() => { vi.unstubAllGlobals() })

describe('conversão de resultados', () => {
  it('rua: o nome é o título e o endereço mostra bairro, cidade e estado', () => {
    const p = photonToPlace(feature('Rua das Castanheiras', 'Campinas', 'São Paulo', -47.06, -22.9, { district: 'Jardim Exemplo' }))!
    expect(p.title).toBe('Rua das Castanheiras')
    expect(p.subtitle).toBe('Jardim Exemplo, Campinas, São Paulo')
    expect(p.icon).toBe('cat-street')
  })
  it('estabelecimento: mostra a rua com número no endereço', () => {
    const p = photonToPlace(feature('Padaria Central', 'Belo Horizonte', 'Minas Gerais', -43.9, -19.9, { osm_key: 'shop', osm_value: 'bakery', street: 'Rua Bahia', housenumber: '1200' }))!
    expect(p.title).toBe('Padaria Central')
    expect(p.subtitle).toBe('Rua Bahia, 1200, Belo Horizonte, Minas Gerais')
    expect(p.icon).toBe('cat-market')
  })
  it('endereço completo (sem nome): rua e número viram o título', () => {
    const p = photonToPlace(feature(undefined as unknown as string, 'São Paulo', 'São Paulo', -46.65, -23.55, { name: undefined, street: 'Rua Augusta', housenumber: '1500', osm_key: 'place', osm_value: 'house' }))!
    expect(p.title).toBe('Rua Augusta, 1500')
  })
  it('mostra o país fora do Brasil', () => {
    const p = photonToPlace(feature('Rue de Rivoli', 'Paris', 'Île-de-France', 2.35, 48.86, { countrycode: 'FR', country: 'França' }))!
    expect(p.subtitle).toBe('Paris, Île-de-France, França')
  })
  it('descarta feições sem nome ou com coordenadas inválidas', () => {
    expect(photonToPlace({ geometry: { coordinates: [0, 0] }, properties: {} })).toBeNull()
    expect(photonToPlace({ geometry: { coordinates: [200, 0] }, properties: { name: 'x' } })).toBeNull()
  })
  it('Nominatim: rotula locais sem nome pelo tipo e mantém a rua', () => {
    const row: NominatimRow = { osm_type: 'node', osm_id: 7, lat: '-23.5', lon: '-46.6', category: 'amenity', type: 'pharmacy', address: { road: 'Avenida Exemplo', suburb: 'Centro', city: 'São Paulo', state: 'São Paulo', country_code: 'br' }, display_name: 'x' }
    expect(nominatimRowToPlace(row)).toMatchObject({ id: 'osm-N7', title: 'Farmácia', subtitle: 'Avenida Exemplo, Centro, São Paulo', icon: 'cat-pharmacy' })
  })
  it('não repete cidade e estado iguais no endereço', () => {
    const p = photonToPlace(feature('Rua Unica', 'Rio de Janeiro', 'Rio de Janeiro', -43.2, -22.9))!
    expect(p.subtitle).toBe('Rio de Janeiro')
  })
  it('categorias e rótulos', () => {
    expect(iconForOsm('amenity', 'hospital')).toBe('cat-hospital')
    expect(iconForOsm('amenity', 'school')).toBe('cat-school')
    expect(iconForOsm('shop', 'supermarket')).toBe('cat-market')
    expect(iconForOsm('leisure', 'park')).toBe('cat-park')
    expect(iconForOsm('amenity', 'place_of_worship')).toBe('cat-church')
    expect(typeLabel('amenity', 'bank')).toBe('Banco')
    expect(typeLabel('highway', 'residential')).toBeUndefined()
  })
})

describe('ordenação e união', () => {
  const mk = (id: string, title: string, lat: number, lon: number): Place => ({ id, title, subtitle: '', position: [lat, lon], icon: 'pin-fill' })
  it('prioriza o que está perto do usuário, sem excluir outras cidades', () => {
    const sp = mk('sp', 'Rua das Castanheiras', -23.55, -46.63)
    const bh = mk('bh', 'Rua das Castanheiras', -19.92, -43.94)
    const fln = mk('fln', 'Rua das Castanheiras', -27.6, -48.5)
    const nearBh = mergePlaces([[sp, fln, bh]], 'rua das castanheiras', [-19.9, -43.9])
    expect(nearBh.map((p) => p.id)).toEqual(['bh', 'sp', 'fln'])
    expect(nearBh).toHaveLength(3)
  })
  it('relevância do texto vem antes da distância', () => {
    const exact = mk('a', 'Avenida Paulista', -22.0, -45.0)
    const partial = mk('b', 'Posto Paulista', -23.5, -46.6)
    expect(mergePlaces([[partial, exact]], 'avenida paulista', [-23.5, -46.6])[0].id).toBe('a')
  })
  it('colapsa trechos da mesma rua, mas mantém ruas homônimas de bairros ou cidades diferentes', () => {
    const seg = (id: string, sub: string, lat: number, lon: number): Place => ({ id, title: 'Rua Augusta', subtitle: sub, position: [lat, lon], icon: 'cat-street' })
    const out = mergePlaces([[
      seg('a', 'Consolação, São Paulo', -23.553, -46.652),
      seg('b', 'Consolação, São Paulo', -23.556, -46.655), // outro trecho da mesma rua
      seg('c', 'Jardim Paulista, São Paulo', -23.565, -46.66), // outro bairro
      seg('d', 'Centro, Campinas', -22.9, -47.06), // outra cidade
    ]], 'rua augusta')
    expect(out.map((p) => p.id)).toEqual(['a', 'c', 'd'])
  })
  it('remove duplicados entre fontes (mesmo id ou mesmo nome muito próximo)', () => {
    const a = [mk('osm-W1', 'Escola Modelo', -23.5, -46.6)]
    const b = [mk('osm-N9', 'Escola Modelo', -23.50001, -46.60001), mk('osm-W1', 'Escola Modelo', -23.5, -46.6)]
    expect(mergePlaces([a, b], 'escola')).toHaveLength(1)
  })
})

const sigFetch = (handler: (url: string, init?: RequestInit) => Promise<Response>) => {
  calls = []
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => { calls.push(url); return handler(url, init) })
}
const nominatimCalls = () => calls.filter((u) => u.includes('nominatim'))

describe('autocomplete: somente Photon (nunca o Nominatim público)', () => {
  it('usa o Photon, envia o viés de localização e guarda em cache', async () => {
    mockFetch(() => ok({ features: [feature('Avenida Teste Um', 'Curitiba', 'Paraná', -49.27, -25.43)] }))
    const out = await searchPlaces('avenida teste um', { bias: [-25.4, -49.3] })
    expect(out.places).toHaveLength(1)
    expect(out.sources).toEqual({ photon: 'ok' })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('photon.komoot.io')
    expect(calls[0]).toContain('lat=-25.4')
    expect(calls[0]).toContain('lon=-49.3')
    await searchPlaces('avenida teste um', { bias: [-25.4, -49.3] })
    expect(calls).toHaveLength(1) // segunda chamada veio do cache
  })

  it('sem viés (sem GPS) a busca é global: nenhuma coordenada é enviada', async () => {
    mockFetch(() => ok({ features: [feature('Rua Global Dois', 'Manaus', 'Amazonas', -60.02, -3.1)] }))
    await searchPlaces('rua global dois')
    expect(calls[0]).not.toContain('lat=')
    expect(calls[0]).not.toContain('lon=')
  })

  it('resultados de várias cidades convivem, sem filtro geográfico', async () => {
    mockFetch(() => ok({ features: [
      feature('Rua Multi Tres', 'Manaus', 'Amazonas', -60.02, -3.1),
      feature('Rua Multi Tres', 'Porto Alegre', 'Rio Grande do Sul', -51.2, -30.03),
      feature('Rua Multi Tres', 'Salvador', 'Bahia', -38.5, -12.97),
    ] }))
    const out = await searchPlaces('rua multi tres')
    expect(out.places.map((p) => p.subtitle.split(', ')[0])).toEqual(expect.arrayContaining(['Manaus', 'Porto Alegre', 'Salvador']))
  })

  it('se o Photon falhar, informa a falha e NÃO chama o Nominatim', async () => {
    mockFetch(() => fail())
    const out = await searchPlaces('rua indisponivel quatro')
    expect(out.sources.photon).toBe('error')
    expect(allSourcesFailed(out)).toBe(true)
    expect(out.places).toEqual([])
    expect(nominatimCalls()).toHaveLength(0)
    const before = calls.length
    await searchPlaces('rua indisponivel quatro')
    expect(calls.length).toBeGreaterThan(before) // falhas não ficam em cache
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('HTTP de erro (ex.: 429/503) também vira falha, sem fallback automático', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 429, json: async () => ({}) } as Response))
    const out = await searchPlaces('rua limitada cinco')
    expect(out.sources.photon).toBe('error')
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('se o Photon vier vazio, mostra "sem resultados" e NÃO chama o Nominatim', async () => {
    mockFetch(() => ok({ features: [] }))
    const out = await searchPlaces('xqzwvk seis')
    expect(out.places).toEqual([])
    expect(allSourcesFailed(out)).toBe(false)
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('digitar muitas consultas seguidas nunca aciona o Nominatim', async () => {
    mockFetch(() => ok({ features: [] }))
    for (const q of ['ru', 'rua', 'rua a', 'rua au', 'rua aug', 'rua augu', 'rua august', 'rua augusta', 'rua augusta 1', 'rua augusta 15']) await searchPlaces(q)
    expect(calls.length).toBeGreaterThan(5)
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('não consulta nada com menos de 2 letras', async () => {
    mockFetch(() => ok({ features: [] }))
    const out = await searchPlaces('a')
    expect(out.places).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('cancelar a busca interrompe a requisição anterior', async () => {
    mockFetch(() => new Promise((_res, rej) => { setTimeout(() => rej(new DOMException('Aborted', 'AbortError')), 20) }))
    const ctrl = new AbortController()
    const p = searchPlaces('rua cancelada sete', { signal: ctrl.signal })
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('lentidão do provedor', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('Photon que nunca responde: a interface recebe a falha em ~4,5 s, sem esperar mais e sem fallback', async () => {
    sigFetch((_url, init) => new Promise((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')))
    }))
    const t0 = Date.now()
    const p = searchPlaces('rua lenta oito')
    await vi.advanceTimersByTimeAsync(PHOTON_TIMEOUT_MS + 600)
    const out = await p
    expect(out.sources.photon).toBe('error')
    expect(Date.now() - t0).toBeLessThan(PHOTON_TIMEOUT_MS + 1000)
    expect(nominatimCalls()).toHaveLength(0)
  })

  it('Photon lento porém dentro do limite ainda devolve resultados', async () => {
    sigFetch(() => new Promise((res) => setTimeout(() => res({ ok: true, status: 200, json: async () => ({ features: [feature('Rua Lenta Nove', 'Recife', 'Pernambuco', -34.88, -8.05)] }) } as Response), 3000)))
    const p = searchPlaces('rua lenta nove')
    await vi.advanceTimersByTimeAsync(4200)
    expect((await p).places).toHaveLength(1)
  })
})

describe('busca explícita no Nominatim (política de uso)', () => {
  const row = (id: number, name: string): NominatimRow => ({ osm_type: 'way', osm_id: id, lat: '-12.9', lon: '-38.5', name, category: 'highway', type: 'residential', address: { city: 'Salvador', state: 'Bahia', country_code: 'br' }, display_name: name })

  it('não consulta com menos de 3 letras', async () => {
    mockFetch(() => ok([]))
    expect(await searchNominatim('ab')).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('faz uma consulta pontual, converte o resultado e guarda em cache', async () => {
    mockFetch(() => ok([row(1, 'Rua Explicita Dez')]))
    const r = await searchNominatim('rua explicita dez', { bias: [-12.9, -38.5] })
    expect(r[0].title).toBe('Rua Explicita Dez')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('nominatim.openstreetmap.org/search')
    expect(calls[0]).not.toContain('bounded') // preferência de região, nunca restrição
    await searchNominatim('rua explicita dez', { bias: [-12.9, -38.5] })
    expect(calls).toHaveLength(1)
  })

  it('consultas iguais simultâneas viram uma só requisição', async () => {
    mockFetch(() => ok([row(2, 'Rua Dupla Onze')]))
    await Promise.all([searchNominatim('rua dupla onze'), searchNominatim('rua dupla onze'), searchNominatim('rua dupla onze')])
    expect(calls).toHaveLength(1)
  })

  it('respeita o limite global de 1 requisição por segundo', async () => {
    vi.useFakeTimers()
    try {
      const stamps: number[] = []
      sigFetch(() => { stamps.push(Date.now()); return ok([row(3, 'Rua Limite')]) })
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
