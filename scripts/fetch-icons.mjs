// Baixa os dados dos ícones usados (src/icons/icon-map.json) da API oficial do Iconify
// e grava src/icons/bundle.json. O app registra esse pacote com addCollection(), então
// os ícones funcionam offline e sem requisições ao carregar a página.
// Uso: npm run icons
import { readFile, writeFile } from 'node:fs/promises'

const map = JSON.parse(await readFile(new URL('../src/icons/icon-map.json', import.meta.url), 'utf8'))
const byPrefix = {}
for (const id of Object.values(map)) {
  const [prefix, name] = id.split(':')
  ;(byPrefix[prefix] ??= new Set()).add(name)
}

const bundle = []
let missing = 0
for (const [prefix, names] of Object.entries(byPrefix)) {
  const url = `https://api.iconify.design/${prefix}.json?icons=${[...names].join(',')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  const data = await res.json()
  const notFound = data.not_found ?? []
  if (notFound.length) { missing += notFound.length; console.error(`NÃO ENCONTRADOS em ${prefix}:`, notFound.join(', ')) }
  bundle.push(data)
  console.log(`${prefix}: ${Object.keys(data.icons ?? {}).length} ícones`)
}
await writeFile(new URL('../src/icons/bundle.json', import.meta.url), JSON.stringify(bundle))
if (missing) { console.error(`${missing} ícone(s) inexistente(s). Corrija icon-map.json.`); process.exit(1) }
