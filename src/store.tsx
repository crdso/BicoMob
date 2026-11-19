import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { insideArea } from './lib/boundary'
import { calculateFare, type Category } from './lib/fare'
import { watchPosition, type MyPos } from './lib/geo'
import { samePlace, type LatLng, type Place } from './lib/places'
import { estimateRoute, fetchRoute, type RouteResult } from './lib/routing'
import { nextTheme, readTheme, saveTheme, type Theme } from './lib/theme'

const KEYS = { profile: 'bicomob:profile:v3', rides: 'bicomob:rides:v3', recents: 'bicomob:recents:v3', theme: 'bicomob:theme:v3' }
const LEGACY_PROFILE_KEY = 'bicomob:profile:v2'
const MAX_RECENTS = 6

const round3 = (n: number) => Math.round(n * 1000) / 1000

/** Histórico guardado no navegador: a posição real do GPS é arredondada (~100 m) e sem o nome da rua. */
export function sanitizeRide(r: Ride): Ride {
  if (r.origin.id !== 'gps') return r
  const rp = (p: LatLng): LatLng => [round3(p[0]), round3(p[1])]
  return {
    ...r,
    origin: { ...r.origin, title: 'Localização atual (aproximada)', subtitle: 'Posição arredondada', position: rp(r.origin.position) },
    coords: r.coords.map(rp),
  }
}

export type Tab = 'home' | 'services' | 'activity' | 'account'
export type AccountSub = 'perfil' | 'favoritos' | 'pagamento' | 'notificacoes' | 'seguranca' | 'ajuda'
export type FavoriteKind = 'home' | 'work'
export type Screen =
  | { k: 'search'; focus: 'origin' | 'dest'; pickFavorite?: FavoriteKind }
  | { k: 'confirm' }
  | { k: 'price' }
  | { k: 'ride' }
  | { k: 'receipt'; id: string }
  | { k: 'activity-detail'; id: string }
  | { k: 'account'; sub: AccountSub }

export type RideStatus = 'searching' | 'enroute' | 'arrived' | 'inprogress' | 'completed' | 'cancelled'

export interface Driver {
  name: string
  rating: number
  vehicle: string
  color: string
  plate: string
  etaMin: number
}

// Motoristas FICTÍCIOS, só para a demonstração.
export const DRIVERS: Record<Category, Driver> = {
  carro: { name: 'João Santos', rating: 4.9, vehicle: 'Fiat Argo', color: 'Branco', plate: 'DEMO-001', etaMin: 4 },
  moto: { name: 'Lucas Almeida', rating: 4.8, vehicle: 'Honda CG 160', color: 'Preta', plate: 'DEMO-002', etaMin: 3 },
}

export interface Ride {
  id: string
  createdAt: number
  origin: Place
  dest: Place
  category: Category
  km: number
  minutes: number
  fare: number
  /** O cliente definiu o valor em "Seu preço" (simulação). */
  custom?: boolean
  routeSource: RouteResult['source']
  coords: RouteResult['coords']
  status: RideStatus
  driver: Driver
  rating?: number
}

export interface Profile {
  name: string
  payment: 'dinheiro' | 'pix' | 'cartao'
  notifications: { corrida: boolean; promo: boolean; seguranca: boolean }
  /** Favoritos definidos pelo próprio usuário (começam vazios). */
  home: Place | null
  work: Place | null
}

const DEFAULT_PROFILE: Profile = {
  name: 'Cliente',
  payment: 'dinheiro',
  notifications: { corrida: true, promo: false, seguranca: true },
  home: null,
  work: null,
}

export type RouteState =
  | { state: 'idle' }
  | { state: 'loading' }
  /** Origem ou destino fora da área da demonstração: a corrida não pode ser confirmada. */
  | { state: 'blocked' }
  | { state: 'ready'; data: RouteResult; failed?: boolean }

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const insideOrNull = (p: Place | null | undefined): Place | null => (p && insideArea(p.position) ? p : null)

function loadProfile(): Profile {
  const current = readJson<Partial<Profile> | null>(KEYS.profile, null)
  // Migração: perfil da versão anterior. O tema salvo lá era só o padrão antigo e NÃO é aproveitado;
  // favoritos de outros lugares são descartados.
  const base = current ?? readJson<Partial<Profile & { theme?: string }>>(LEGACY_PROFILE_KEY, {})
  const { name, payment, notifications } = base
  return { ...DEFAULT_PROFILE, ...(name ? { name } : {}), ...(payment ? { payment } : {}), ...(notifications ? { notifications } : {}), home: insideOrNull(current?.home), work: insideOrNull(current?.work) }
}
const loadArray = <T,>(key: string): T[] => {
  const v = readJson<unknown>(key, [])
  return Array.isArray(v) ? (v as T[]) : []
}
function readSession(): boolean {
  try { return sessionStorage.getItem('bicomob:session') === '1' } catch { return false }
}

interface Store {
  logged: boolean
  login(): void
  logout(clear?: boolean): void
  profile: Profile
  setProfile(p: Partial<Profile>): void
  theme: Theme
  setTheme(t: Theme): void
  toggleTheme(): void
  rides: Ride[]
  clearRides(): void
  rateRide(id: string, rating: number): void
  recents: Place[]
  addRecent(p: Place): void
  tab: Tab
  setTab(t: Tab): void
  stack: Screen[]
  push(s: Screen): void
  pop(): void
  goHome(): void
  origin: Place | null
  dest: Place | null
  /** Posição real (só em memória) enquanto o usuário permitir; usada para o ponto azul e para priorizar buscas. */
  me: MyPos | null
  setMe(p: MyPos | null): void
  setOrigin(p: Place | null): void
  setDest(p: Place | null): void
  swap(): void
  /** Tipo de viagem escolhido na tela de opções. NÃO há padrão: começa vazio a cada viagem. */
  category: Category | null
  /** Valor definido em "Seu preço" (simulação), ou null. */
  customFare: number | null
  chooseOption(c: Category): void
  chooseCustomFare(vehicle: Category, fare: number): void
  route: RouteState
  loadRoute(): void
  prices: Record<Category, number> | null
  /** Preço efetivo da seleção atual (valor próprio ou tarifa calculada). */
  chosenFare: number | null
  activeRide: Ride | null
  requestRide(): void
  advanceRide(s: RideStatus): void
  cancelRide(): void
  finishRide(): string | null
  repeat(r: Ride): void
  toast: string | null
  showToast(m: string): void
}

const Ctx = createContext<Store>(null as never)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [logged, setLogged] = useState(readSession)
  const [profile, setProfileState] = useState<Profile>(loadProfile)
  const [theme, setThemeState] = useState<Theme>(() => readTheme(typeof localStorage === 'undefined' ? undefined : localStorage))
  const [rides, setRides] = useState<Ride[]>(() => loadArray<Ride>(KEYS.rides))
  const [recents, setRecents] = useState<Place[]>(() => loadArray<Place>(KEYS.recents).filter((p) => insideArea(p.position)))
  const [tab, setTab] = useState<Tab>('home')
  const [stack, setStack] = useState<Screen[]>([])
  // Sem origem até o usuário escolher ou autorizar a localização: nunca fingimos uma posição.
  const [origin, setOriginState] = useState<Place | null>(null)
  const [dest, setDestState] = useState<Place | null>(null)
  const [me, setMe] = useState<MyPos | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [customFare, setCustomFare] = useState<number | null>(null)
  const [route, setRoute] = useState<RouteState>({ state: 'idle' })
  const [activeRide, setActiveRide] = useState<Ride | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>()

  // Limpa dados de versões anteriores do app guardados neste navegador (qualquer chave `bicomob:` que não seja atual).
  useEffect(() => {
    try {
      const current = new Set<string>(Object.values(KEYS))
      for (const k of Object.keys(localStorage)) if (k.startsWith('bicomob:') && !current.has(k)) localStorage.removeItem(k)
    } catch { /* sem storage */ }
  }, [])
  useEffect(() => { try { localStorage.setItem(KEYS.profile, JSON.stringify(profile)) } catch { /* sem storage */ } }, [profile])
  useEffect(() => { try { localStorage.setItem(KEYS.rides, JSON.stringify(rides)) } catch { /* sem storage */ } }, [rides])
  useEffect(() => { try { localStorage.setItem(KEYS.recents, JSON.stringify(recents)) } catch { /* sem storage */ } }, [recents])

  // Depois que o usuário autorizou a localização, mantém o ponto azul atualizado (só em memória).
  const watching = me !== null
  useEffect(() => {
    if (!watching) return
    return watchPosition((p) => setMe(p), () => { /* mantém a última posição conhecida */ })
  }, [watching])

  const showToast = useCallback((m: string) => {
    setToast(m)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const setTheme = (t: Theme) => { setThemeState(t); saveTheme(typeof localStorage === 'undefined' ? undefined : localStorage, t) }

  const reqId = useRef(0)
  // Qualquer mudança no trajeto invalida a rota e a escolha de viagem feita antes.
  const resetRoute = () => { reqId.current++; setRoute({ state: 'idle' }); setCategory(null); setCustomFare(null) }

  const setOrigin = (p: Place | null) => { setOriginState(p); resetRoute() }
  const setDest = (p: Place | null) => { setDestState(p); resetRoute() }
  const swap = () => {
    if (!dest || !origin) return
    setOriginState(dest)
    setDestState(origin)
    resetRoute()
  }

  // Recentes: só destinos dentro da área que o usuário escolheu (nunca a posição do GPS).
  const addRecent = useCallback((p: Place) => {
    if (p.id === 'gps' || !insideArea(p.position)) return
    setRecents((rs) => [p, ...rs.filter((r) => !samePlace(r, p))].slice(0, MAX_RECENTS))
  }, [])

  const loadRoute = useCallback(() => {
    if (!dest || !origin) return
    // Bloqueio geográfico: não calcula nem confirma corrida com pontos fora do município.
    if (!insideArea(origin.position) || !insideArea(dest.position)) { setRoute({ state: 'blocked' }); return }
    const id = ++reqId.current
    setRoute({ state: 'loading' })
    fetchRoute(origin.position, dest.position)
      .then((data) => { if (id === reqId.current) setRoute({ state: 'ready', data }) })
      .catch(() => { if (id === reqId.current) setRoute({ state: 'ready', data: estimateRoute(origin.position, dest.position), failed: true }) })
  }, [origin, dest])

  const prices = useMemo(() => {
    if (route.state !== 'ready') return null
    const { km, minutes } = route.data
    return { moto: calculateFare('moto', km, minutes), carro: calculateFare('carro', km, minutes) }
  }, [route])

  const chosenFare = customFare ?? (category && prices ? prices[category] : null)

  const chooseOption = (c: Category) => { setCategory(c); setCustomFare(null) }
  const chooseCustomFare = (vehicle: Category, fare: number) => { setCategory(vehicle); setCustomFare(fare) }

  const requestRide = () => {
    if (!dest || !origin || route.state !== 'ready' || !prices || !category || chosenFare == null) return
    if (!insideArea(origin.position) || !insideArea(dest.position)) return
    const r = route.data
    const ride: Ride = {
      id: `r${Date.now()}`,
      createdAt: Date.now(),
      origin, dest, category,
      km: r.km, minutes: r.minutes,
      fare: chosenFare,
      custom: customFare != null,
      routeSource: r.source, coords: r.coords,
      status: 'searching',
      driver: DRIVERS[category],
    }
    setActiveRide(ride)
    setStack((s) => [...s, { k: 'ride' }])
  }

  // Simula o aceite do motorista após 2–4 s; o timer é limpo ao cancelar/desmontar.
  useEffect(() => {
    if (activeRide?.status !== 'searching') return
    const t = window.setTimeout(
      () => setActiveRide((r) => (r && r.status === 'searching' ? { ...r, status: 'enroute' } : r)),
      2000 + Math.random() * 2000,
    )
    return () => window.clearTimeout(t)
  }, [activeRide?.status, activeRide?.id])

  const advanceRide = (status: RideStatus) => setActiveRide((r) => (r ? { ...r, status } : r))

  const cancelRide = () => {
    if (!activeRide) return
    setRides((rs) => [sanitizeRide({ ...activeRide, status: 'cancelled' }), ...rs])
    setActiveRide(null)
  }

  const finishRide = () => {
    if (!activeRide) return null
    const done = { ...activeRide, status: 'completed' as const }
    setRides((rs) => [sanitizeRide(done), ...rs])
    setActiveRide(null)
    return done.id
  }

  const repeat = (r: Ride) => {
    setOriginState(r.origin)
    setDestState(r.dest)
    resetRoute() // a viagem repetida também passa pela escolha de tipo e preço
    setStack((s) => [...s, { k: 'confirm' }])
  }

  const value: Store = {
    logged,
    login: () => {
      try { sessionStorage.setItem('bicomob:session', '1') } catch { /* ok */ }
      setLogged(true); setTab('home'); setStack([])
    },
    logout: (clear) => {
      try { sessionStorage.removeItem('bicomob:session') } catch { /* ok */ }
      if (clear) { setRides([]); setRecents([]); setProfileState(DEFAULT_PROFILE) }
      setActiveRide(null); setStack([]); setTab('home'); setDestState(null); setOriginState(null); setMe(null); resetRoute()
      setLogged(false)
    },
    profile,
    setProfile: (p) => setProfileState((x) => ({ ...x, ...p })),
    theme, setTheme, toggleTheme: () => setTheme(nextTheme(theme)),
    rides,
    clearRides: () => { setRides([]); setRecents([]) },
    rateRide: (id, rating) => setRides((rs) => rs.map((r) => (r.id === id ? { ...r, rating } : r))),
    recents, addRecent,
    tab, setTab: (t) => { setTab(t); setStack([]) },
    stack,
    push: (s) => setStack((x) => [...x, s]),
    pop: () => setStack((x) => x.slice(0, -1)),
    goHome: () => { setStack([]); setTab('home') },
    origin, dest, me, setMe, setOrigin, setDest, swap,
    category, customFare, chooseOption, chooseCustomFare,
    route, loadRoute, prices, chosenFare,
    activeRide, requestRide, advanceRide, cancelRide, finishRide, repeat,
    toast, showToast,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
