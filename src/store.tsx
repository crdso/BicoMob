import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { calculateFare, type Category } from './lib/fare'
import { loadBoundary } from './lib/boundary'
import { watchPosition, type MyPos } from './lib/geo'
import { CENTRO, isIftoZone, type LatLng, type Place } from './lib/places'
import { estimateRoute, fetchRoute, type RouteResult } from './lib/routing'

const round3 = (n: number) => Math.round(n * 1000) / 1000

/** Histórico guardado no navegador: a posição real do GPS é arredondada (~100 m) e sem o nome da rua. */
function sanitizeRide(r: Ride): Ride {
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
export type Screen =
  | { k: 'search'; focus: 'origin' | 'dest'; pickFavorite?: 'casa' }
  | { k: 'confirm' }
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
  iftoZone: boolean
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
  theme: 'dark' | 'light'
  casa: Place
}

const DEFAULT_PROFILE: Profile = {
  name: 'Cliente',
  payment: 'dinheiro',
  notifications: { corrida: true, promo: false, seguranca: true },
  theme: 'dark',
  casa: CENTRO,
}

export type RouteState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; data: RouteResult; failed?: boolean }

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem('bicomob:profile')
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE
  } catch {
    return DEFAULT_PROFILE
  }
}
function loadRides(): Ride[] {
  try {
    const raw = localStorage.getItem('bicomob:rides')
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
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
  rides: Ride[]
  clearRides(): void
  rateRide(id: string, rating: number): void
  tab: Tab
  setTab(t: Tab): void
  stack: Screen[]
  push(s: Screen): void
  pop(): void
  goHome(): void
  origin: Place | null
  dest: Place | null
  /** Posição real (só em memória) enquanto o usuário permitir; usada para o ponto azul no mapa. */
  me: MyPos | null
  setMe(p: MyPos | null): void
  setOrigin(p: Place | null): void
  setDest(p: Place | null): void
  swap(): void
  category: Category
  setCategory(c: Category): void
  route: RouteState
  loadRoute(): void
  prices: Record<Category, number> | null
  iftoZone: boolean
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
  const [rides, setRides] = useState<Ride[]>(loadRides)
  const [tab, setTab] = useState<Tab>('home')
  const [stack, setStack] = useState<Screen[]>([])
  // Sem origem até o usuário escolher: nunca fingimos que ele está no Centro.
  const [origin, setOriginState] = useState<Place | null>(null)
  const [dest, setDestState] = useState<Place | null>(null)
  const [me, setMe] = useState<MyPos | null>(null)
  const [category, setCategory] = useState<Category>('moto')
  const [route, setRoute] = useState<RouteState>({ state: 'idle' })
  const [activeRide, setActiveRide] = useState<Ride | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>()

  useEffect(() => {
    try { localStorage.setItem('bicomob:profile', JSON.stringify(profile)) } catch { /* sem storage */ }
  }, [profile])
  useEffect(() => {
    try { localStorage.setItem('bicomob:rides', JSON.stringify(rides)) } catch { /* sem storage */ }
  }, [rides])

  // Limite municipal real (OSM). Em cache no navegador depois da primeira vez.
  useEffect(() => { void loadBoundary() }, [])

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

  const reqId = useRef(0)
  const resetRoute = () => { reqId.current++; setRoute({ state: 'idle' }) }

  const setOrigin = (p: Place | null) => { setOriginState(p); resetRoute() }
  const setDest = (p: Place | null) => { setDestState(p); resetRoute() }
  const swap = () => {
    if (!dest || !origin) return
    setOriginState(dest)
    setDestState(origin)
    resetRoute()
  }

  const loadRoute = useCallback(() => {
    if (!dest || !origin) return
    const id = ++reqId.current
    setRoute({ state: 'loading' })
    fetchRoute(origin.position, dest.position)
      .then((data) => { if (id === reqId.current) setRoute({ state: 'ready', data }) })
      .catch(() => { if (id === reqId.current) setRoute({ state: 'ready', data: estimateRoute(origin.position, dest.position), failed: true }) })
  }, [origin, dest])

  const iftoZone = dest && origin ? isIftoZone(origin, dest) : false
  const prices = useMemo(() => {
    if (route.state !== 'ready') return null
    const { km, minutes } = route.data
    return {
      moto: calculateFare('moto', km, minutes, iftoZone),
      carro: calculateFare('carro', km, minutes, iftoZone),
    }
  }, [route, iftoZone])

  const requestRide = () => {
    if (!dest || !origin || route.state !== 'ready' || !prices) return
    const r = route.data
    const ride: Ride = {
      id: `r${Date.now()}`,
      createdAt: Date.now(),
      origin, dest, category,
      km: r.km, minutes: r.minutes,
      fare: prices[category],
      iftoZone, routeSource: r.source, coords: r.coords,
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
    setCategory(r.category)
    resetRoute()
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
      if (clear) { setRides([]); setProfileState(DEFAULT_PROFILE) }
      setActiveRide(null); setStack([]); setTab('home'); setDestState(null); setOriginState(null); setMe(null); resetRoute()
      setLogged(false)
    },
    profile,
    setProfile: (p) => setProfileState((x) => ({ ...x, ...p })),
    rides,
    clearRides: () => setRides([]),
    rateRide: (id, rating) => setRides((rs) => rs.map((r) => (r.id === id ? { ...r, rating } : r))),
    tab, setTab: (t) => { setTab(t); setStack([]) },
    stack,
    push: (s) => setStack((x) => [...x, s]),
    pop: () => setStack((x) => x.slice(0, -1)),
    goHome: () => { setStack([]); setTab('home') },
    origin, dest, me, setMe, setOrigin, setDest, swap,
    category, setCategory,
    route, loadRoute, prices, iftoZone,
    activeRide, requestRide, advanceRide, cancelRide, finishRide, repeat,
    toast, showToast,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
