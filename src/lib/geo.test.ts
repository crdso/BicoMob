import { beforeAll, describe, expect, it } from 'vitest'
import boundaryGeojson from './__fixtures__/araguatins-geojson.json'
import { insideMunicipio, pointInRing, setBoundary, toBoundary } from './boundary'
import { GEO_MESSAGES, geoSupportProblem, placeFromMyPos } from './geo'
import { CENTRO, HOSPITAL, IFTO, PRACA, type LatLng, type Place } from './places'
import { accentPattern, buildOverpassQuery, detectCategory, iconForOsm, mergePlaces, nominatimRowToPlace, overpassToPlace, photonToPlace, typeLabel } from './search'

describe('locais sem nome no OSM (nada é inventado)', () => {
  it('rotula pelo tipo e mantém a rua como endereço', () => {
    const p = nominatimRowToPlace({ osm_type: 'node', osm_id: 7, lat: '-5.65', lon: '-48.12', category: 'amenity', type: 'pharmacy', address: { road: 'Avenida Araguaia', suburb: 'Centro' }, display_name: 'Avenida Araguaia, Centro' })
    expect(p).toMatchObject({ id: 'osm-N7', title: 'Farmácia', icon: 'cat-pharmacy' })
    expect(p.subtitle).toBe('Avenida Araguaia, Centro, Araguatins - TO')
  })
  it('com nome cadastrado, usa o nome', () => {
    const p = nominatimRowToPlace({ osm_type: 'way', osm_id: 8, lat: '-5.65', lon: '-48.12', name: 'Drogaria Central', category: 'amenity', type: 'pharmacy', address: { road: 'Rua 1' }, display_name: 'x' })
    expect(p.title).toBe('Drogaria Central')
  })
  it('typeLabel traduz tipos comuns e ignora o resto', () => {
    expect(typeLabel('amenity', 'place_of_worship')).toBe('Igreja')
    expect(typeLabel('shop', 'supermarket')).toBe('Mercado')
    expect(typeLabel('highway', 'residential')).toBeUndefined()
  })
})

describe('limite municipal real de Araguatins (polígono OSM)', () => {
  beforeAll(() => {
    setBoundary(toBoundary(boundaryGeojson as never, 336850))
  })

  it('aceita locais dentro do município, incluindo o IFTO na zona rural', () => {
    expect(insideMunicipio(CENTRO.position)).toBe(true)
    expect(insideMunicipio(IFTO.position)).toBe(true)
    expect(insideMunicipio(HOSPITAL.position)).toBe(true)
    expect(insideMunicipio(PRACA.position)).toBe(true)
  })

  it('rejeita cidades vizinhas, mesmo dentro da caixa retangular do município', () => {
    expect(insideMunicipio([-5.4695, -47.8838])).toBe(false) // Augustinópolis-TO
    expect(insideMunicipio([-5.52, -47.47])).toBe(false) // Imperatriz-MA
    expect(insideMunicipio([-10.18, -48.33])).toBe(false) // Palmas-TO
    expect(insideMunicipio([-23.55, -46.63])).toBe(false) // São Paulo
  })

  it('rejeita pontos no Pará, do outro lado do rio Araguaia', () => {
    expect(insideMunicipio([-5.64, -48.30])).toBe(false)
  })

  it('point-in-ring básico', () => {
    const square: [number, number][] = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
    expect(pointInRing(2, 2, square)).toBe(true)
    expect(pointInRing(5, 2, square)).toBe(false)
  })
})

describe('pesquisa: categorias, ícones e conversões', () => {
  it('detecta categorias em português, com ou sem acento', () => {
    expect(detectCategory('Farmácia')).not.toBeNull()
    expect(detectCategory('farmacia do centro')).not.toBeNull()
    expect(detectCategory('escola')).not.toBeNull()
    expect(detectCategory('supermercado')).not.toBeNull()
    expect(detectCategory('Avenida Araguaia')).toBeNull()
  })

  it('mapeia tags OSM para ícones por categoria', () => {
    expect(iconForOsm('amenity', 'hospital')).toBe('cat-hospital')
    expect(iconForOsm('amenity', 'pharmacy')).toBe('cat-pharmacy')
    expect(iconForOsm('amenity', 'school')).toBe('cat-school')
    expect(iconForOsm('amenity', 'university')).toBe('cat-graduation')
    expect(iconForOsm('amenity', 'place_of_worship')).toBe('cat-church')
    expect(iconForOsm('shop', 'supermarket')).toBe('cat-market')
    expect(iconForOsm('shop', 'clothes')).toBe('cat-shop')
    expect(iconForOsm('highway', 'residential')).toBe('cat-street')
    expect(iconForOsm('place', 'suburb')).toBe('cat-neighborhood')
    expect(iconForOsm('leisure', 'park')).toBe('cat-park')
  })

  it('regex do Overpass ignora acentos', () => {
    const re = new RegExp(accentPattern('Praça'), 'i')
    expect(re.test('Praça do Mercado')).toBe(true)
    expect(re.test('PRACA CENTRAL')).toBe(true)
    expect(accentPattern('a.b(c)')).not.toContain('(')
  })

  it('monta consulta Overpass limitada por raio e com saída restrita', () => {
    const q = buildOverpassQuery('farmácia', CENTRO.position, detectCategory('farmácia'))
    expect(q).toContain('[out:json]')
    expect(q).toContain('around:20000')
    expect(q).toContain('"amenity"="pharmacy"')
    expect(q).toContain('out tags center 40')
  })

  it('converte feição do Photon em Place sem inventar dados', () => {
    const p = photonToPlace({
      geometry: { coordinates: [-48.1203369, -5.6483903] },
      properties: { osm_type: 'W', osm_id: 1036639812, osm_key: 'amenity', osm_value: 'hospital', name: 'Hospital Municipal de Araguatins', street: 'Rua Bartolomeu Bueno da Silva', district: 'Centro' },
    })
    expect(p).toMatchObject({ id: 'osm-W1036639812', title: 'Hospital Municipal de Araguatins', icon: 'cat-hospital', position: [-5.6483903, -48.1203369] })
    expect(p?.subtitle).toBe('Rua Bartolomeu Bueno da Silva, Centro, Araguatins - TO')
    expect(photonToPlace({ geometry: { coordinates: [0, 0] }, properties: {} })).toBeNull()
  })

  it('converte elemento do Overpass (nó e via com center)', () => {
    const node = overpassToPlace({ type: 'node', id: 1, lat: -5.65, lon: -48.12, tags: { name: 'Farmácia Exemplo', amenity: 'pharmacy', 'addr:street': 'Rua 1' } })
    expect(node).toMatchObject({ id: 'osm-N1', icon: 'cat-pharmacy' })
    const way = overpassToPlace({ type: 'way', id: 2, center: { lat: -5.65, lon: -48.11 }, tags: { name: 'Mercado X', shop: 'supermarket' } })
    expect(way).toMatchObject({ id: 'osm-W2', icon: 'cat-market', position: [-5.65, -48.11] })
    expect(overpassToPlace({ type: 'node', id: 3, lat: 1, lon: 1, tags: {} })).toBeNull()
  })

  it('une fontes sem duplicar e ordena por relevância', () => {
    const mk = (id: string, title: string, pos: LatLng): Place => ({ id, title, subtitle: '', position: pos, icon: 'pin-fill' })
    const a = [mk('osm-W1', 'Escola Daniel Berg', [-5.65, -48.12]), mk('osm-W2', 'Colégio Escola Nova', [-5.651, -48.121])]
    const b = [mk('osm-N9', 'Escola Daniel Berg', [-5.65001, -48.12001]), mk('osm-W1', 'Escola Daniel Berg', [-5.65, -48.12])]
    const out = mergePlaces([a, b], 'escola', CENTRO.position)
    expect(out).toHaveLength(2)
    expect(out[0].title).toBe('Escola Daniel Berg')
  })
})

describe('localização atual (sem fingir o Centro)', () => {
  it('monta a origem a partir da posição real e do nome da rua', () => {
    const p = placeFromMyPos({ lat: -5.65, lng: -48.12, accuracy: 18.4 }, { road: 'Rua 13 de Outubro', suburb: 'Centro' })
    expect(p).toMatchObject({ id: 'gps', title: 'Rua 13 de Outubro', position: [-5.65, -48.12], icon: 'gps-fill' })
    expect(p.subtitle).toContain('±18 m')
  })

  it('sem geocodificação reversa, usa "Sua localização atual" e não um endereço inventado', () => {
    const p = placeFromMyPos({ lat: -5.65, lng: -48.12, accuracy: 5 }, null)
    expect(p.title).toBe('Sua localização atual')
  })

  it('mensagens claras para cada falha', () => {
    for (const k of ['unsupported', 'insecure', 'denied', 'unavailable', 'timeout'] as const) {
      expect(GEO_MESSAGES[k].length).toBeGreaterThan(20)
      expect(GEO_MESSAGES[k]).toMatch(/manualmente/)
    }
  })

  it('sem navegador (ambiente de teste) a localização é reportada como não suportada', () => {
    expect(geoSupportProblem()).toBe('unsupported')
  })
})
