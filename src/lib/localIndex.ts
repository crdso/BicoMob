import indexData from '../data/places-index.json'
import { insideArea } from './boundary'
import { normalize, type Place } from './places'
import { iconForOsm, typeLabel } from './osm'

// Índice local de ruas, bairros e lugares nomeados do município (dados reais do OpenStreetMap,
// gerados por `npm run data`). Responde na hora e sem rede; complementa o autocomplete online.

interface IndexStreet { n: string; lat: number; lng: number; s?: string }
interface IndexPlace { n: string; c: string; lat: number; lng: number; a?: string; s?: string }
const data = indexData as { streets: IndexStreet[]; places: IndexPlace[] }

interface Entry { place: Place; norm: string; words: string[]; /** tipo OSM, ex.: "amenity:school" */ cat?: string }

function toEntries(): Entry[] {
  const out: Entry[] = []
  data.streets.forEach((s, i) => {
    const place: Place = { id: `idx-s${i}`, title: s.n, subtitle: s.s ?? '', position: [s.lat, s.lng], icon: 'cat-street' }
    if (insideArea(place.position)) out.push({ place, norm: normalize(s.n), words: normalize(s.n).split(/[\s,.-]+/).filter(Boolean) })
  })
  data.places.forEach((p, i) => {
    const [key, value] = p.c.split(':')
    const kind = typeLabel(key, value)
    const place: Place = {
      id: `idx-p${i}`,
      title: p.n,
      subtitle: [p.a, p.s ?? (kind && kind !== p.n ? kind : undefined)].filter(Boolean).join(', '),
      position: [p.lat, p.lng],
      icon: iconForOsm(key, value),
    }
    if (insideArea(place.position)) out.push({ place, norm: normalize(p.n), words: normalize(p.n).split(/[\s,.-]+/).filter(Boolean), cat: p.c })
  })
  return out
}

let entries: Entry[] | null = null
const all = () => (entries ??= toEntries())

// Apelidos comuns: o que as pessoas digitam → como aparece no cadastro.
const ALIASES: Record<string, string> = {
  ifto: 'instituto federal',
  ubs: 'unidade basica',
  upa: 'pronto',
  prefeitura: 'prefeitura',
}

// Palavras de categoria: "mercado", "farmácia"… listam os lugares cadastrados daquele tipo (por tipo, não só por nome).
const CATEGORY_WORDS: [RegExp, RegExp][] = [
  [/^(mercado|supermercado|mercadinho|mercearia)$/, /^(shop:(supermarket|convenience|greengrocer|butcher)|amenity:marketplace)$/],
  [/^(farmacia|drogaria)$/, /^(amenity:pharmacy|healthcare:pharmacy)$/],
  [/^(banco|bancos|caixa|lotericas?)$/, /^amenity:(bank|atm)$/],
  [/^(igreja|igrejas|templo|capela)$/, /^amenity:place_of_worship$/],
  [/^(posto|postos|combustivel|gasolina)$/, /^amenity:fuel$/],
  [/^(praca|pracas|parque|parques)$/, /^leisure:(park|garden|playground)$/],
  [/^(restaurante|restaurantes|lanchonete|lanchonetes)$/, /^amenity:(restaurant|fast_food|cafe|bar|pub)$/],
  [/^(hotel|pousada|hospedagem)$/, /^tourism:(hotel|guest_house|motel|hostel)$/],
  [/^(escola|escolas|colegio|creche)$/, /^amenity:(school|kindergarten)$/],
  [/^(hospital|clinica|saude)$/, /^(amenity:(hospital|clinic|doctors)|healthcare:.*)$/],
]

function expandQuery(q: string): string[] {
  return normalize(q).split(/\s+/).filter(Boolean).map((t) => ALIASES[t] ?? t)
}

function rank(e: Entry, tokens: string[], whole: string): number {
  if (e.norm === whole) return 0
  if (e.norm.startsWith(whole)) return 1
  if (tokens.every((t) => e.words.some((w) => w.startsWith(t)))) return 2
  return 3
}

/** Ruas, bairros e lugares cujo nome contém todas as palavras digitadas (prefixo de palavra). */
export function searchLocal(q: string, limit = 20): Place[] {
  const tokens = expandQuery(q).flatMap((t) => t.split(/\s+/))
  if (!tokens.length || tokens.join('').length < 2) return []
  const whole = tokens.join(' ')
  const hits: { e: Entry; r: number }[] = []
  for (const e of all()) {
    const ok = tokens.every((t) => e.words.some((w) => w.startsWith(t)) || (t.length >= 3 && e.norm.includes(t)))
    if (ok) hits.push({ e, r: rank(e, tokens, whole) })
  }
  // Palavra de categoria isolada: inclui também os lugares do tipo, mesmo sem a palavra no nome.
  if (tokens.length === 1) {
    const rule = CATEGORY_WORDS.find(([w]) => w.test(tokens[0]))
    if (rule) {
      const seen = new Set(hits.map((h) => h.e.place.id))
      for (const e of all()) if (e.cat && !seen.has(e.place.id) && rule[1].test(e.cat)) hits.push({ e, r: 3 })
    }
  }
  return hits
    .sort((a, b) => a.r - b.r || a.e.place.title.localeCompare(b.e.place.title, 'pt'))
    .slice(0, limit)
    .map((h) => h.e.place)
}

export const localIndexSize = () => all().length
