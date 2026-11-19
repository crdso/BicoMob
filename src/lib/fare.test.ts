import { describe, expect, it } from 'vitest'
import { brl, calculateFare, FARE_CONFIG, fareBreakdown, priceOptions } from './fare'

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

describe('Seu preço: grade 3×3 determinística', () => {
  it('tem 9 valores, inclui o preço sugerido e é crescente', () => {
    for (const c of ['moto', 'carro'] as const) {
      for (const sug of [7.1, 9.4, 13, 17.04, 24.99, 35.83, 129.12]) {
        const g = priceOptions(sug, c)
        expect(g).toHaveLength(9)
        expect(g.some((v) => Math.abs(v - sug) < 0.005)).toBe(true)
        expect([...g].sort((a, b) => a - b)).toEqual(g)
      }
    }
  })
  it('nunca fica abaixo da corrida mínima da categoria', () => {
    for (const c of ['moto', 'carro'] as const) {
      const min = FARE_CONFIG[c].minimum
      expect(Math.min(...priceOptions(min, c))).toBeGreaterThanOrEqual(min)
      expect(Math.min(...priceOptions(min + 0.7, c))).toBeGreaterThanOrEqual(min)
    }
  })
  it('é determinística: o mesmo trajeto gera sempre a mesma grade', () => {
    expect(priceOptions(17.04, 'moto')).toEqual(priceOptions(17.04, 'moto'))
    expect(priceOptions(35.83, 'carro')).toEqual(priceOptions(35.83, 'carro'))
  })
  it('passos de R$ 0,50 até R$ 25 e de R$ 1,00 acima, centrada no sugerido quando possível', () => {
    const g = priceOptions(17.04, 'moto')
    expect(g[4]).toBe(17.04)
    expect(g[5] - g[4]).toBeCloseTo(0.5, 5)
    const h = priceOptions(35.83, 'carro')
    expect(h[4]).toBe(35.83)
    expect(h[5] - h[4]).toBeCloseTo(1, 5)
  })
  it('perto do mínimo, a grade sobe a partir dele sem perder o sugerido', () => {
    const g = priceOptions(7.0, 'moto')
    expect(g[0]).toBe(7)
    expect(g).toHaveLength(9)
  })
})
