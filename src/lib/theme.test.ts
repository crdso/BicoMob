import { describe, expect, it } from 'vitest'
import { nextTheme, readTheme, saveTheme, THEME_KEY } from './theme'

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial }
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v }, data }
}

describe('tema', () => {
  it('primeira visita: claro, mesmo sem nada salvo', () => {
    expect(readTheme(fakeStorage())).toBe('light')
    expect(readTheme(undefined)).toBe('light')
  })

  it('ignora a preferência de tema do sistema operacional', () => {
    // O leitor não consulta matchMedia: só a escolha salva pelo usuário conta.
    expect(readTheme(fakeStorage())).toBe('light')
  })

  it('respeita a escolha nova do usuário e a mantém nas próximas visitas', () => {
    const st = fakeStorage()
    saveTheme(st, 'dark')
    expect(st.data[THEME_KEY]).toBe('dark')
    expect(readTheme(st)).toBe('dark')
    saveTheme(st, 'light')
    expect(readTheme(st)).toBe('light')
  })

  it('migração: o tema escuro salvo pela versão anterior (outra chave) não é reaproveitado', () => {
    const legacy = fakeStorage({ 'bicomob:profile:v2': JSON.stringify({ name: 'Cliente', theme: 'dark' }), 'bicomob:profile': JSON.stringify({ theme: 'dark' }) })
    expect(readTheme(legacy)).toBe('light')
  })

  it('valor inválido ou armazenamento quebrado voltam ao claro', () => {
    expect(readTheme(fakeStorage({ [THEME_KEY]: 'azul' }))).toBe('light')
    expect(readTheme({ getItem: () => { throw new Error('bloqueado') } })).toBe('light')
    expect(() => saveTheme({ setItem: () => { throw new Error('cheio') } }, 'dark')).not.toThrow()
  })

  it('alternância', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})
