import { fetchWithTimeout, throttled, TtlCache } from './net'
import type { LatLng, Place } from './places'

// Localização REAL do usuário via API nativa do navegador. A posição fica só em memória:
// não é gravada no localStorage nem enviada a nenhum serviço, exceto a geocodificação reversa
// (Nominatim), que recebe a coordenada apenas para devolver o nome da rua.

export type GeoFailure = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout'

export interface MyPos {
  lat: number
  lng: number
  /** precisão em metros */
  accuracy: number
}

export class GeoError extends Error {
  constructor(public kind: GeoFailure) {
    super(kind)
  }
}

export function geoSupportProblem(): GeoFailure | null {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported'
  if (typeof window !== 'undefined' && window.isSecureContext === false) return 'insecure'
  return null
}

export const GEO_MESSAGES: Record<GeoFailure, string> = {
  unsupported: 'Este navegador não oferece localização. Escolha o ponto de partida manualmente.',
  insecure: 'A localização só funciona em conexão segura (HTTPS) ou em localhost. Escolha o ponto de partida manualmente.',
  denied: 'Permissão de localização negada. Libere o acesso nas configurações do navegador ou escolha o ponto de partida manualmente.',
  unavailable: 'Não foi possível obter sua posição (GPS ou rede indisponível). Escolha o ponto de partida manualmente.',
  timeout: 'A localização demorou demais para responder. Tente novamente ou escolha o ponto de partida manualmente.',
}

function mapError(e: GeolocationPositionError): GeoError {
  return new GeoError(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable')
}

const toPos = (p: GeolocationPosition): MyPos => ({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })

export function getCurrentPosition(): Promise<MyPos> {
  const problem = geoSupportProblem()
  if (problem) return Promise.reject(new GeoError(problem))
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition((p) => resolve(toPos(p)), (e) => reject(mapError(e)), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 15000,
    })
  })
}

/**
 * Estado da permissão de localização SEM disparar o pedido ao usuário.
 * Só quando já está 'granted' usamos a posição automaticamente (ex.: ao reabrir o app).
 */
export async function geolocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (geoSupportProblem() || !navigator.permissions?.query) return 'unknown'
    return (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state
  } catch {
    return 'unknown'
  }
}

/** Acompanha a posição (ex.: ponto azul no mapa). Retorna a função que para o acompanhamento. */
export function watchPosition(onPos: (p: MyPos) => void, onError?: (e: GeoError) => void): () => void {
  if (geoSupportProblem()) return () => {}
  const id = navigator.geolocation.watchPosition((p) => onPos(toPos(p)), (e) => onError?.(mapError(e)), {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 20000,
  })
  return () => navigator.geolocation.clearWatch(id)
}

/* ------------------------------ Geocodificação reversa ------------------------------ */

export interface ReverseResult {
  road?: string
  suburb?: string
  city?: string
  state?: string
}

/** Bairro (ou cidade, se não houver) a partir de um resultado de geocodificação reversa. */
export function describeArea(rev: ReverseResult | null): string {
  return rev?.suburb ?? rev?.city ?? ''
}

const revCache = new TtlCache<ReverseResult | null>(30 * 60 * 1000, 60)

export async function reverseGeocode(pos: LatLng, signal?: AbortSignal): Promise<ReverseResult | null> {
  const key = `${pos[0].toFixed(4)},${pos[1].toFixed(4)}`
  const hit = revCache.get(key)
  if (hit !== undefined) return hit
  try {
    await throttled('nominatim', 1100, signal)
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${pos[0]}&lon=${pos[1]}`,
      { headers: { 'Accept-Language': navigator.language || 'pt-BR' } },
      8000,
      signal,
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const j = (await res.json()) as { error?: string; address?: Record<string, string> }
    if (j.error || !j.address) { revCache.set(key, null); return null }
    const a = j.address
    const out: ReverseResult = {
      road: a.road ? `${a.road}${a.house_number ? ', ' + a.house_number : ''}` : undefined,
      suburb: a.suburb ?? a.neighbourhood,
      city: a.city ?? a.town ?? a.village ?? a.municipality,
      state: a.state,
    }
    revCache.set(key, out)
    return out
  } catch (err) {
    if ((err as Error).name === 'AbortError' && signal?.aborted) throw err
    return null
  }
}

/** Origem "Sua localização atual" a partir de uma posição real. */
export function placeFromMyPos(pos: MyPos, rev: ReverseResult | null): Place {
  const acc = Math.round(pos.accuracy)
  return {
    id: 'gps',
    title: rev?.road ?? 'Sua localização atual',
    subtitle: [rev?.road ? 'Sua localização atual' : undefined, describeArea(rev) || undefined, `±${acc} m`].filter(Boolean).join(' • '),
    position: [pos.lat, pos.lng],
    icon: 'gps-fill',
  }
}
