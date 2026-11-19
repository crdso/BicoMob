import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Garante que o projeto continua genérico: sem dependência de nenhuma cidade e com o título exato.
const root = process.cwd()
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.claude'])
const SELF = join('src', 'lib', 'project.test.ts')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|css|html|md|json|mjs|svg)$/.test(name) && !name.startsWith('package-lock')) out.push(full)
  }
  return out
}

describe('projeto genérico', () => {
  const files = walk(root).filter((f) => relative(root, f) !== SELF)
  const regional = /araguatins|\bifto\b|augustin[oó]polis|imperatriz|castanheiras\b.*araguatins/i

  it('nenhum arquivo do projeto (código, docs, dados) cita a antiga cidade', () => {
    const offenders = files.filter((f) => regional.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f))
    expect(offenders).toEqual([])
  })

  it('o código não tem coordenadas nem limites geográficos fixos', () => {
    const src = walk(join(root, 'src')).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'))
    const offenders = src.filter((f) => /-5\.65|-48\.11|boundary|insideMunicipio|MUNICIPIO|DEMO_BOUNDS/.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f))
    expect(offenders).toEqual([])
  })

  it('o título da aba é exatamente "BicoMob"', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    expect(html).toMatch(/<title>BicoMob<\/title>/)
    expect(html).toMatch(/property="og:title" content="BicoMob"/)
    expect(html).toMatch(/name="twitter:title" content="BicoMob"/)
  })

  it('mantém o favicon próprio', () => {
    expect(readFileSync(join(root, 'index.html'), 'utf8')).toContain('href="/favicon.svg"')
    expect(statSync(join(root, 'public', 'favicon.svg')).isFile()).toBe(true)
  })
})
