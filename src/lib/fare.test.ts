import { describe, expect, it } from 'vitest'
import { brl, calculateFare, FARE_CONFIG, fareBreakdown } from './fare'

describe('calculateFare', () => {
  it('moto 2 km / 6 min = 7,10', () => expect(calculateFare('moto', 2, 6)).toBe(7.1))
  it('carro 2 km / 6 min cai na tarifa mínima (13,00)', () => expect(calculateFare('carro', 2, 6)).toBe(13))
  it('moto 5 km / 10 min = 12,50', () => expect(calculateFare('moto', 5, 10)).toBe(12.5))
  it('carro 5 km / 10 min = 23,50', () => expect(calculateFare('carro', 5, 10)).toBe(23.5))
  it('moto 5 km / 11 min = 12,65', () => expect(calculateFare('moto', 5, 11)).toBe(12.65))
  it('carro 5 km / 11 min = 23,75', () => expect(calculateFare('carro', 5, 11)).toBe(23.75))
  it('aplica a corrida mínima em trajetos curtos', () => {
    expect(calculateFare('moto', 0.2, 1)).toBe(FARE_CONFIG.moto.minimum)
    expect(calculateFare('carro', 0.2, 1)).toBe(FARE_CONFIG.carro.minimum)
  })
  it('o preço muda com o trajeto e carro custa mais que moto', () => {
    expect(calculateFare('moto', 8, 15)).not.toBe(calculateFare('moto', 3, 8))
    expect(calculateFare('carro', 8, 15)).toBeGreaterThan(calculateFare('moto', 8, 15))
  })
  it('não há suplemento por região: mesma distância, mesmo preço em qualquer lugar', () => {
    expect(calculateFare('carro', 12.3, 25)).toBe(calculateFare('carro', 12.3, 25))
    expect(Object.keys(FARE_CONFIG.moto).sort()).toEqual(['base', 'minimum', 'perKm', 'perMinute'])
  })
  it('rejeita entradas inválidas', () => {
    expect(() => calculateFare('moto', -1, 5)).toThrow()
    expect(() => calculateFare('moto', 1, 0)).toThrow()
    expect(() => calculateFare('moto', NaN, 5)).toThrow()
  })
  it('o detalhamento soma exatamente o total', () => {
    for (const c of ['moto', 'carro'] as const) {
      for (const [km, min] of [[0.4, 2], [5, 10], [23.7, 41]] as const) {
        const sum = fareBreakdown(c, km, min).reduce((s, l) => s + l.value, 0)
        expect(Math.round(sum * 100) / 100).toBe(calculateFare(c, km, min))
      }
    }
  })
  it('formata em BRL', () => expect(brl(15.15)).toBe('R$ 15,15'))
})
