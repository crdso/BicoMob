import { describe, expect, it } from 'vitest'
import { AREA_BBOX, AREA_CENTER, areaOutline, insideArea, pointInRing } from './boundary'
import { localIndexSize, searchLocal } from './localIndex'

describe('bloqueio geográfico (polígono real do município)', () => {
  it('aceita o centro, o IFTO (zona rural do município) e locais conhecidos', () => {
    expect(insideArea(AREA_CENTER)).toBe(true)
    expect(insideArea([-5.6452, -48.0716])).toBe(true) // IFTO Campus Araguatins
    expect(insideArea([-5.64839, -48.12034])).toBe(true) // hospital municipal
    expect(insideArea([-5.64851, -48.12097])).toBe(true) // órgão público no centro
  })

  it('rejeita cidades vizinhas e outras capitais', () => {
    expect(insideArea([-5.4695, -47.8838])).toBe(false) // Augustinópolis-TO
    expect(insideArea([-5.5265, -47.4917])).toBe(false) // Imperatriz-MA
    expect(insideArea([-10.1844, -48.3336])).toBe(false) // Palmas-TO
    expect(insideArea([-23.5614, -46.6559])).toBe(false) // São Paulo-SP
    expect(insideArea([-19.9227, -43.9451])).toBe(false) // Belo Horizonte-MG
  })

  it('rejeita o outro lado do rio (Pará)', () => {
    expect(insideArea([-5.64, -48.3])).toBe(false)
  })

  it('NÃO usa só a caixa: existem pontos dentro da bbox que o polígono rejeita', () => {
    const [s, w, n, e] = AREA_BBOX
    let inBboxOutsidePolygon = 0
    let insideBoth = 0
    for (let i = 0; i <= 30; i++) {
      for (let j = 0; j <= 30; j++) {
        const p: [number, number] = [s + ((n - s) * i) / 30, w + ((e - w) * j) / 30]
        if (insideArea(p)) insideBoth++
        else inBboxOutsidePolygon++
      }
    }
    expect(insideBoth).toBeGreaterThan(100)
    expect(inBboxOutsidePolygon).toBeGreaterThan(50)
  })

  it('valores inválidos nunca são aceitos', () => {
    expect(insideArea([NaN, -48])).toBe(false)
    expect(insideArea([-5.65, Infinity])).toBe(false)
    expect(insideArea([0, 0])).toBe(false)
  })

  it('point-in-ring básico e contorno desenhável', () => {
    const square: [number, number][] = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
    expect(pointInRing(2, 2, square)).toBe(true)
    expect(pointInRing(5, 2, square)).toBe(false)
    expect(areaOutline().length).toBeGreaterThan(0)
  })
})

describe('índice local de ruas e lugares', () => {
  it('tem cobertura real e todos os itens estão dentro do município', () => {
    expect(localIndexSize()).toBeGreaterThan(100)
    for (const p of searchLocal('rua', 200)) expect(insideArea(p.position)).toBe(true)
  })

  it('encontra ruas e avenidas por nome, com ou sem acento e em qualquer caixa', () => {
    expect(searchLocal('avenida dom orione')[0]?.title).toBe('Avenida Dom Orione')
    expect(searchLocal('AVENIDA DOM ORIONE')[0]?.title).toBe('Avenida Dom Orione')
    expect(searchLocal('floriano')[0]?.title).toContain('Floriano Peixoto')
    expect(searchLocal('rua 7').map((p) => p.title)).toContain('Rua 7')
  })

  it('encontra o IFTO pela sigla e pelo nome', () => {
    expect(searchLocal('ifto')[0]?.title).toMatch(/Instituto Federal.*Araguatins/)
    expect(searchLocal('instituto federal')[0]?.position[0]).toBeCloseTo(-5.64588, 3)
  })

  it('encontra escolas, hospital, bancos e bairros', () => {
    expect(searchLocal('escola').length).toBeGreaterThan(10)
    expect(searchLocal('hospital').some((p) => p.icon === 'cat-hospital')).toBe(true)
    expect(searchLocal('banco').length + searchLocal('bradesco').length + searchLocal('caixa').length).toBeGreaterThan(0)
    expect(searchLocal('centro').some((p) => p.icon === 'cat-neighborhood')).toBe(true)
  })

  it('palavras de categoria listam lugares pelo tipo cadastrado (mercado, banco, posto, praça…)', () => {
    expect(searchLocal('mercado').some((p) => p.icon === 'cat-market')).toBe(true)
    expect(searchLocal('banco').some((p) => p.icon === 'cat-bank')).toBe(true)
    expect(searchLocal('posto').some((p) => p.icon === 'cat-fuel')).toBe(true)
    expect(searchLocal('praça').some((p) => p.icon === 'cat-park')).toBe(true)
    expect(searchLocal('igreja').some((p) => p.icon === 'cat-church')).toBe(true)
  })

  it('consultas curtas ou sem correspondência não retornam nada', () => {
    expect(searchLocal('a')).toEqual([])
    expect(searchLocal('xqzwvkj')).toEqual([])
  })

  it('NÃO contém ruas de outras cidades', () => {
    expect(searchLocal('avenida paulista')).toEqual([])
    expect(searchLocal('rua augusta')).toEqual([])
  })
})
