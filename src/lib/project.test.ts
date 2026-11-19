import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}
const read = (p: string) => readFileSync(join(root, p), 'utf8')
/** Remove comentários para olhar só o que o código realmente exibe. */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** Só o que a tela exibe: literais de texto e texto JSX (identificadores de código ficam de fora). */
const visibleText = (src: string): string => {
  const strings = src.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? []
  const jsx = src.match(/>[^<>{}=;]+</g) ?? []
  return [...strings, ...jsx].join('\n')
}

const uiFiles = () =>
  walk(join(root, 'src'))
    .filter((f) => /\.tsx$/.test(f) && !f.endsWith('.test.tsx'))
    .map((f) => ({ f: relative(root, f), src: stripComments(readFileSync(f, 'utf8')) }))

describe('identidade', () => {
  it('o título da aba é exatamente "BicoMob" (também em og:title e twitter:title)', () => {
    const html = read('index.html')
    expect(html).toMatch(/<title>BicoMob<\/title>/)
    expect(html).toMatch(/property="og:title" content="BicoMob"/)
    expect(html).toMatch(/name="twitter:title" content="BicoMob"/)
  })

  it('mantém o favicon próprio', () => {
    expect(read('index.html')).toContain('href="/favicon.svg"')
    expect(statSync(join(root, 'public', 'favicon.svg')).isFile()).toBe(true)
  })
})

describe('interface sem detalhes técnicos', () => {
  it('nenhum texto exibido cita provedores ou APIs (exceto a atribuição obrigatória do mapa)', () => {
    const technical = /OpenStreetMap|Nominatim|Photon|OSRM|Overpass|Leaflet|geocodifica|\bAPI\b/i
    const offenders = uiFiles()
      .filter(({ f }) => !f.endsWith('MapPanel.tsx')) // a atribuição legal do mapa fica aqui
      .filter(({ src }) => technical.test(visibleText(src)))
      .map(({ f }) => f)
    expect(offenders).toEqual([])
  })

  it('a atribuição obrigatória do mapa continua presente e visível (sem esconder por CSS)', () => {
    const map = read('src/components/MapPanel.tsx')
    expect(map).toContain('OpenStreetMap')
    expect(map).toContain('openstreetmap.org/copyright')
    expect(read('src/styles.css')).not.toMatch(/leaflet-control-attribution\s*\{[^}]*display:\s*none/)
  })

  it('usa os textos de interface combinados', () => {
    const all = uiFiles().map((x) => x.src).join('\n')
    expect(all).toContain('Buscar endereço')
    expect(all).toContain('Nenhum endereço encontrado')
    expect(all).toContain('Não foi possível carregar o mapa')
    expect(all).toContain('Escolher no mapa')
    expect(all).toContain('Solicitar BicoMob')
    expect(all).toContain('Escolha sua viagem')
  })
})

describe('tela inicial e cabeçalho', () => {
  it('não existe a seção "Mais formas de usar o BicoMob" nem seus cartões', () => {
    const all = uiFiles().map((x) => x.src).join('\n') + read('src/styles.css')
    expect(all).not.toMatch(/Mais formas de usar/i)
    expect(all).not.toMatch(/Moto na cidade|Carro com conforto/)
    expect(all).not.toMatch(/\.promo/)
  })

  it('a Home não oferece atalhos de Moto/Carro antes do destino', () => {
    const tabs = stripComments(read('src/screens/Tabs.tsx'))
    const home = tabs.slice(tabs.indexOf('export function Home'), tabs.indexOf('export function Services'))
    expect(home).not.toMatch(/Moto|Carro|setCategory|MotoArt|CarArt/)
    const services = tabs.slice(tabs.indexOf('export function Services'), tabs.indexOf('const dt ='))
    expect(services).not.toMatch(/Moto|Carro|setCategory/)
  })

  it('o selo "Demo" saiu do cabeçalho e deu lugar ao botão de tema (sol/lua)', () => {
    const ui = stripComments(read('src/components/UI.tsx'))
    const header = ui.slice(ui.indexOf('export function AppHeader'), ui.indexOf('export function ScreenHeader'))
    expect(header).not.toMatch(/Demo|demo-badge/)
    expect(header).toContain('<ThemeButton />')
    expect(ui).toContain("'sun-fill'")
    expect(ui).toContain("'moon-fill'")
    expect(ui).toMatch(/aria-label=\{light \?/)
  })

  it('a barra de status usa barras de sinal, não um ícone de GPS', () => {
    const app = stripComments(read('src/App.tsx'))
    expect(app).toContain('<SignalBars />')
    const bar = app.slice(app.indexOf('className="statusbar"'), app.indexOf('className="statusbar"') + 400)
    expect(bar).not.toMatch(/name="gps"|crosshair/)
    expect((app.match(/<rect /g) ?? []).length).toBe(4)
  })
})
