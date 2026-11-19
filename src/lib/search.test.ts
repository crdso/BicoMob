import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Place } from './places'
import {
  allSourcesFailed, iconForOsm, mergePlaces, nominatimRowToPlace, photonToPlace, searchPlaces, typeLabel,
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

describe('searchPlaces: Photon principal, Nominatim como fallback', () => {
  it('usa só o Photon quando ele responde, envia o viés de localização e guarda em cache', async () => {
    mockFetch(() => ok({ features: [feature('Avenida Teste Um', 'Curitiba', 'Paraná', -49.27, -25.43)] }))
    const out = await searchPlaces('avenida teste um', { bias: [-25.4, -49.3] })
    expect(out.places).toHaveLength(1)
    expect(out.sources).toMatchObject({ photon: 'ok', nominatim: 'skipped' })
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

  it('se o Photon falhar, consulta o Nominatim automaticamente', async () => {
    mockFetch((url) => (url.includes('photon') ? fail() : ok([{ osm_type: 'way', osm_id: 5, lat: '-12.9', lon: '-38.5', name: 'Rua Fallback Quatro', category: 'highway', type: 'residential', address: { city: 'Salvador', state: 'Bahia', country_code: 'br' }, display_name: 'x' }])))
    const out = await searchPlaces('rua fallback quatro')
    expect(out.sources).toMatchObject({ photon: 'error', nominatim: 'ok' })
    expect(out.places[0].title).toBe('Rua Fallback Quatro')
    expect(calls.some((u) => u.includes('nominatim'))).toBe(true)
  })

  it('se o Photon vier vazio, o Nominatim complementa', async () => {
    mockFetch((url) => (url.includes('photon') ? ok({ features: [] }) : ok([{ osm_type: 'node', osm_id: 8, lat: '-23.5', lon: '-46.6', category: 'amenity', type: 'pharmacy', address: { road: 'Rua Cinco', city: 'São Paulo', state: 'São Paulo', country_code: 'br' }, display_name: 'x' }])))
    const out = await searchPlaces('farmacia cinco')
    expect(out.sources.nominatim).toBe('ok')
    expect(out.places[0].title).toBe('Farmácia')
  })

  it('com as duas fontes fora do ar, informa a falha e não guarda em cache', async () => {
    mockFetch(() => fail())
    const out = await searchPlaces('rua indisponivel seis')
    expect(allSourcesFailed(out)).toBe(true)
    expect(out.places).toHaveLength(0)
    const before = calls.length
    await searchPlaces('rua indisponivel seis')
    expect(calls.length).toBeGreaterThan(before) // tentou de novo: falhas não ficam em cache
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
