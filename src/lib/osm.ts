import type { IconKey } from './places'

// Categorias do OpenStreetMap → ícone e rótulo em português.

export function iconForOsm(key?: string, value?: string): IconKey {
  const k = key ?? ''
  const v = value ?? ''
  if (k === 'highway') return 'cat-street'
  if (k === 'place') return ['suburb', 'neighbourhood', 'quarter', 'city_block', 'borough'].includes(v) ? 'cat-neighborhood' : 'pin-fill'
  if (k === 'amenity') {
    if (['university', 'college'].includes(v)) return 'cat-graduation'
    if (['school', 'kindergarten', 'library', 'language_school'].includes(v)) return 'cat-school'
    if (['hospital', 'clinic', 'doctors', 'dentist'].includes(v)) return 'cat-hospital'
    if (v === 'pharmacy') return 'cat-pharmacy'
    if (v === 'place_of_worship') return 'cat-church'
    if (['townhall', 'courthouse', 'police', 'fire_station', 'post_office', 'community_centre', 'public_building'].includes(v)) return 'cat-government'
    if (['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'ice_cream', 'food_court'].includes(v)) return 'cat-food'
    if (v === 'fuel') return 'cat-fuel'
    if (['bank', 'atm'].includes(v)) return 'cat-bank'
    if (['bus_station', 'taxi', 'ferry_terminal'].includes(v)) return 'cat-transport'
    if (v === 'marketplace') return 'cat-market'
    return 'cat-building'
  }
  if (k === 'healthcare') return v === 'pharmacy' ? 'cat-pharmacy' : 'cat-hospital'
  if (k === 'shop') return ['supermarket', 'convenience', 'greengrocer', 'butcher', 'bakery', 'mall'].includes(v) ? 'cat-market' : 'cat-shop'
  if (k === 'craft') return v === 'bakery' ? 'cat-market' : 'cat-shop'
  if (k === 'leisure') return ['pitch', 'sports_centre', 'stadium', 'fitness_centre'].includes(v) ? 'cat-sports' : 'cat-park'
  if (k === 'tourism') return ['hotel', 'guest_house', 'motel', 'hostel'].includes(v) ? 'cat-hotel' : 'pin-fill'
  if (k === 'railway' || k === 'public_transport') return 'cat-transport'
  if (k === 'office') return 'cat-government'
  if (k === 'building') return 'cat-building'
  return 'pin-fill'
}

/** Nome em português do tipo OSM, para locais que existem no mapa mas não têm nome cadastrado. */
export function typeLabel(key?: string, value?: string): string | undefined {
  const v = value ?? ''
  if (key === 'amenity') {
    if (v === 'pharmacy') return 'Farmácia'
    if (['hospital', 'clinic', 'doctors'].includes(v)) return 'Unidade de saúde'
    if (['school', 'kindergarten'].includes(v)) return 'Escola'
    if (v === 'place_of_worship') return 'Igreja'
    if (v === 'fuel') return 'Posto de combustível'
    if (v === 'bank') return 'Banco'
  }
  if (key === 'shop') return ['supermarket', 'convenience'].includes(v) ? 'Mercado' : 'Loja'
  return undefined
}

