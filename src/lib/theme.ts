export type Theme = 'light' | 'dark'

export const THEME_KEY = 'bicomob:theme:v3'

/**
 * Tema salvo. O padrão é SEMPRE o claro na primeira visita, ignorando a preferência do sistema.
 * Só a escolha feita pelo usuário (chave própria) é respeitada: o tema escuro "salvo" por versões
 * anteriores (que era apenas o padrão antigo, em outra chave) não é reaproveitado.
 */
export function readTheme(storage: Pick<Storage, 'getItem'> | undefined): Theme {
  try {
    const v = storage?.getItem(THEME_KEY)
    return v === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function saveTheme(storage: Pick<Storage, 'setItem'> | undefined, theme: Theme): void {
  try { storage?.setItem(THEME_KEY, theme) } catch { /* sem storage */ }
}

export const nextTheme = (t: Theme): Theme => (t === 'light' ? 'dark' : 'light')
