import { describe, expect, it } from 'vitest'
import { brl, calculateFare, fareBreakdown } from './fare'
import { CENTRO, HOSPITAL, IFTO, isIftoZone } from './places'

describe('calculateFare', () => {
  it('moto urbano 2 km / 6 min = 7,10', () => expect(calculateFare('moto', 2, 6, false)).toBe(7.1))
  it('carro urbano 2 km / 6 min = mínima 13,00', () => expect(calculateFare('carro', 2, 6, false)).toBe(13))
  it('moto IFTO 5 km / 10 min = 15,00', () => expect(calculateFare('moto', 5, 10, true)).toBe(15))
  it('carro IFTO 5 km / 10 min = 30,00', () => expect(calculateFare('carro', 5, 10, true)).toBe(30))
  it('moto IFTO 5 km / 11 min = 15,15', () => expect(calculateFare('moto', 5, 11, true)).toBe(15.15))
  it('carro IFTO 5 km / 11 min = 30,25', () => expect(calculateFare('carro', 5, 11, true)).toBe(30.25))
  it('mínima aplicada antes do suplemento', () => expect(calculateFare('moto', 0.5, 1, true)).toBe(9.5))
  it('preço muda com o trajeto', () => {
    expect(calculateFare('moto', 8, 15, false)).not.toBe(calculateFare('moto', 3, 8, false))
  })
  it('rejeita entradas inválidas', () => {
    expect(() => calculateFare('moto', -1, 5, false)).toThrow()
    expect(() => calculateFare('moto', 1, 0, false)).toThrow()
    expect(() => calculateFare('moto', NaN, 5, false)).toThrow()
  })
  it('detalhamento soma ao total', () => {
    const lines = fareBreakdown('carro', 5, 10, true)
    const sum = lines.reduce((s, l) => s + l.value, 0)
    expect(Math.round(sum * 100) / 100).toBe(calculateFare('carro', 5, 10, true))
  })
  it('formata em BRL', () => expect(brl(15.15)).toBe('R$ 15,15'))
})

describe('zona IFTO e locais', () => {
  it('suplemento por origem ou destino IFTO, uma vez', () => {
    expect(isIftoZone(CENTRO, IFTO)).toBe(true)
    expect(isIftoZone(IFTO, CENTRO)).toBe(true)
    expect(isIftoZone(CENTRO, HOSPITAL)).toBe(false)
  })
  it('GPS perto do IFTO também aciona o suplemento', () => {
    const gps = { id: 'gps', title: 'x', subtitle: '', position: [-5.6452, -48.0716] as [number, number], icon: 'gps-fill' as const }
    expect(isIftoZone(gps, CENTRO)).toBe(true)
  })
})
