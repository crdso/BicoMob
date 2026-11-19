import { describe, expect, it } from 'vitest'
import { describeArea, GEO_MESSAGES, geoSupportProblem, placeFromMyPos } from './geo'
import { haversineKm, isValidPosition, samePlace, type Place } from './places'
import { sanitizeRide, type Ride } from '../store'

describe('localização atual (nunca inventada)', () => {
  it('monta a origem a partir da posição real e do nome da rua', () => {
    const p = placeFromMyPos({ lat: -23.5614, lng: -46.6559, accuracy: 18.4 }, { road: 'Avenida Paulista', suburb: 'Consolação', city: 'São Paulo', state: 'São Paulo' })
    expect(p).toMatchObject({ id: 'gps', title: 'Avenida Paulista', position: [-23.5614, -46.6559], icon: 'gps-fill' })
    expect(p.subtitle).toContain('Consolação')
    expect(p.subtitle).toContain('±18 m')
  })

  it('sem geocodificação reversa usa um rótulo neutro, sem endereço inventado', () => {
    const p = placeFromMyPos({ lat: 48.85, lng: 2.35, accuracy: 5 }, null)
    expect(p.title).toBe('Sua localização atual')
    expect(p.subtitle).toBe('±5 m')
  })

  it('descreve a área em qualquer país', () => {
    expect(describeArea({ suburb: 'Shibuya', city: 'Tóquio' })).toBe('Shibuya')
    expect(describeArea({ city: 'Tóquio' })).toBe('Tóquio')
    expect(describeArea(null)).toBe('')
  })

  it('mensagens claras para cada falha, sempre oferecendo escolha manual', () => {
    for (const k of ['unsupported', 'insecure', 'denied', 'unavailable', 'timeout'] as const) {
      expect(GEO_MESSAGES[k].length).toBeGreaterThan(20)
      expect(GEO_MESSAGES[k]).toMatch(/manualmente/)
    }
  })

  it('sem navegador (ambiente de teste) a localização é reportada como não suportada', () => {
    expect(geoSupportProblem()).toBe('unsupported')
  })
})

describe('coordenadas e distância (globais)', () => {
  it('valida posições do mundo todo', () => {
    expect(isValidPosition([-23.55, -46.63])).toBe(true)
    expect(isValidPosition([35.68, 139.69])).toBe(true)
    expect(isValidPosition([-33.86, 151.2])).toBe(true)
    expect(isValidPosition([91, 0])).toBe(false)
    expect(isValidPosition([0, 181])).toBe(false)
    expect(isValidPosition([NaN, 0])).toBe(false)
  })
  it('haversine entre cidades distantes', () => {
    expect(haversineKm([-23.55, -46.63], [-22.9, -43.17])).toBeGreaterThan(330) // São Paulo ↔ Rio
    expect(haversineKm([-23.55, -46.63], [-23.55, -46.63])).toBe(0)
  })
  it('samePlace considera 30 m', () => {
    const a: Place = { id: 'a', title: 'a', subtitle: '', position: [10, 10], icon: 'pin-fill' }
    expect(samePlace(a, { ...a, id: 'b', position: [10.0001, 10] })).toBe(true)
    expect(samePlace(a, { ...a, id: 'c', position: [10.01, 10] })).toBe(false)
  })
})

describe('privacidade do histórico', () => {
  const base = (origin: Place): Ride => ({
    id: 'r1', createdAt: 1, origin, dest: { id: 'd', title: 'Destino', subtitle: 'x', position: [-23.5, -46.6], icon: 'pin-fill' },
    category: 'moto', km: 3, minutes: 9, fare: 10, routeSource: 'osrm', coords: [[-23.56141, -46.65591], [-23.5, -46.6]], status: 'completed',
    driver: { name: 'x', rating: 5, vehicle: 'v', color: 'c', plate: 'DEMO-001', etaMin: 3 },
  })
  it('a posição do GPS é arredondada e sem nome da rua', () => {
    const r = sanitizeRide(base({ id: 'gps', title: 'Rua Exemplo, 10', subtitle: 'x', position: [-23.56141, -46.65591], icon: 'gps-fill' }))
    expect(r.origin.title).toBe('Localização atual (aproximada)')
    expect(r.origin.position).toEqual([-23.561, -46.656])
    expect(r.coords[0]).toEqual([-23.561, -46.656])
  })
  it('origens escolhidas pelo usuário não são alteradas', () => {
    const origin: Place = { id: 'osm-W1', title: 'Rua Escolhida', subtitle: 'Cidade', position: [-23.5, -46.6], icon: 'cat-street' }
    expect(sanitizeRide(base(origin)).origin).toEqual(origin)
  })
})
