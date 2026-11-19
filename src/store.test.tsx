import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StoreProvider, useStore } from './store'

function Probe() {
  const s = useStore()
  return createElement('pre', null, JSON.stringify({ category: s.category, customFare: s.customFare, chosenFare: s.chosenFare, theme: s.theme, origin: s.origin, dest: s.dest, route: s.route.state }))
}
const initial = () => {
  const html = renderToString(createElement(StoreProvider, null, createElement(Probe)))
  return JSON.parse(html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"'))
}

describe('estado inicial do app', () => {
  it('não há categoria (Moto/Carro) nem preço pré-selecionados: a escolha só acontece na tela de opções', () => {
    const s = initial()
    expect(s.category).toBeNull()
    expect(s.customFare).toBeNull()
    expect(s.chosenFare).toBeNull()
  })

  it('o tema padrão é o claro', () => {
    expect(initial().theme).toBe('light')
  })

  it('não há partida, destino nem rota assumidos', () => {
    const s = initial()
    expect(s.origin).toBeNull()
    expect(s.dest).toBeNull()
    expect(s.route).toBe('idle')
  })
})
