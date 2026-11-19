// Gera os dados geográficos locais usados pelo app (executar manualmente quando quiser atualizar):
//   npm run data
//
//  - src/data/municipio.json     polígono real do município (OpenStreetMap, relation 336850)
//  - src/data/places-index.json  índice de ruas, bairros e lugares nomeados dentro do polígono
//
// Fontes: Nominatim (polígono) e Overpass API (ruas e lugares). Dados © contribuidores do
// OpenStreetMap (ODbL). Os arquivos gerados ficam versionados para o app funcionar sem consultar
// esses serviços para validar limites ou localizar ruas e lugares conhecidos.
import { writeFile } from 'node:fs/promises'

const RELATION = 336850
const UA = 'bicomob-build-script (projeto de demonstracao)'
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const round5 = (n) => Math.round(n * 1e5) / 1e5

async function polygon() {
  const url = `https://nominatim.openstreetmap.org/lookup?format=jsonv2&polygon_geojson=1&polygon_threshold=0.00015&osm_ids=R${RELATION}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error('polígono: HTTP ' + res.status)
  const row = (await res.json())[0]
  if (!row?.geojson) throw new Error('polígono ausente')
  const [s, n, w, e] = row.boundingbox.map(Number)
  return { source: `OpenStreetMap relation/${RELATION} (ODbL)`, bbox: [s, w, n, e], center: [Number(row.lat), Number(row.lon)], geometry: row.geojson }
}

async function overpass() {
  const q = `[out:json][timeout:150];
rel(${RELATION});map_to_area->.a;
(
 way(area.a)["highway"]["name"];
 nwr(area.a)["name"]["place"];
 nwr(area.a)["name"]["amenity"];
 nwr(area.a)["name"]["shop"];
 nwr(area.a)["name"]["leisure"];
 nwr(area.a)["name"]["tourism"];
 nwr(area.a)["name"]["office"];
 nwr(area.a)["name"]["healthcare"];
 nwr(area.a)["name"]["craft"];
);
out tags center;`
  let last
  for (const m of MIRRORS) {
    try {
      const res = await fetch(m, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, signal: AbortSignal.timeout(170000) })
      const txt = await res.text()
      if (res.ok && txt.startsWith('{')) return JSON.parse(txt).elements
      last = new Error(`${m}: HTTP ${res.status}`)
    } catch (e) { last = e }
  }
  throw last
}

const pos = (e) => [e.lat ?? e.center?.lat, e.lon ?? e.center?.lon]
const KEYS = ['amenity', 'shop', 'leisure', 'tourism', 'office', 'healthcare', 'craft', 'place']

const poly = await polygon()
const els = (await overpass()).filter((e) => e.tags?.name && pos(e)[0] != null)

// bairros: referência para dar contexto (bairro) às ruas e lugares
const suburbs = els.filter((e) => ['suburb', 'neighbourhood', 'quarter'].includes(e.tags.place)).map((e) => ({ n: e.tags.name, p: pos(e) }))
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
const nearestSuburb = (p) => {
  let best
  let bd = 0.02 ** 2 // ~2 km
  for (const s of suburbs) { const d = dist2(p, s.p); if (d < bd) { bd = d; best = s.n } }
  return best
}

// ruas: uma entrada por nome, usando o trecho mais próximo do centro dos trechos (sempre um ponto sobre a rua)
const byName = new Map()
for (const e of els.filter((x) => x.tags.highway)) {
  if (!byName.has(e.tags.name)) byName.set(e.tags.name, [])
  byName.get(e.tags.name).push(pos(e))
}
const streets = [...byName.entries()].map(([n, pts]) => {
  const avg = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  const p = pts.reduce((b, c) => (dist2(c, avg) < dist2(b, avg) ? c : b))
  return { n, lat: round5(p[0]), lng: round5(p[1]), s: nearestSuburb(p) }
}).sort((a, b) => a.n.localeCompare(b.n, 'pt'))

const places = els.filter((x) => !x.tags.highway).map((e) => {
  const k = KEYS.find((key) => e.tags[key])
  const p = pos(e)
  const road = e.tags['addr:street'] ? `${e.tags['addr:street']}${e.tags['addr:housenumber'] ? ', ' + e.tags['addr:housenumber'] : ''}` : undefined
  return { n: e.tags.name, c: `${k}:${e.tags[k]}`, lat: round5(p[0]), lng: round5(p[1]), a: road, s: e.tags['addr:suburb'] ?? nearestSuburb(p) }
}).sort((a, b) => a.n.localeCompare(b.n, 'pt'))

await writeFile(new URL('../src/data/municipio.json', import.meta.url), JSON.stringify(poly))
await writeFile(new URL('../src/data/places-index.json', import.meta.url), JSON.stringify({ source: 'OpenStreetMap contributors (ODbL)', generatedAt: new Date().toISOString().slice(0, 10), streets, places }))
console.log(`polígono: ${poly.geometry.coordinates[0].length} vértices | ruas: ${streets.length} | lugares: ${places.length}`)
