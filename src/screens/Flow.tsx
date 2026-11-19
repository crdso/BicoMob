import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, CarArt, MotoArt } from '../components/Art'
import { Icon } from '../components/Icon'
import MapPanel from '../components/MapPanel'
import { PlaceIcon, ScreenHeader, Sheet } from '../components/UI'
import { insideMunicipio, isBoundaryExact, loadBoundary } from '../lib/boundary'
import { brl, fareBreakdown, FARE_CONFIG, type Category } from '../lib/fare'
import { GEO_MESSAGES, getCurrentPosition, GeoError, placeFromMyPos, reverseGeocode, type GeoFailure } from '../lib/geo'
import { ARAGUATINS_CENTER, normalize, samePlace, SUGGESTED_PLACES, type LatLng, type Place } from '../lib/places'
import { mergePlaces, searchNominatim, searchPlaces, type SearchOutcome } from '../lib/search'
import { useStore, type Ride } from '../store'

const PAGE = 8
const MIN_CHARS = 2
const DEBOUNCE_MS = 400

type Loc =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; kind: GeoFailure }
  | { status: 'outside'; city?: string }

/* ------------------------------ Busca ------------------------------ */
export function SearchScreen({ focus: initialFocus, pickFavorite }: { focus: 'origin' | 'dest'; pickFavorite?: 'casa' }) {
  const { origin, dest, me, setMe, setOrigin, setDest, swap, pop, push, setProfile, profile, showToast } = useStore()
  const [focus, setFocus] = useState(initialFocus)
  const [q, setQ] = useState('')
  const [typed, setTyped] = useState(false)
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null)
  const [searching, setSearching] = useState(false)
  const [visible, setVisible] = useState(PAGE)
  const [extra, setExtra] = useState<Place[]>([])
  const [extraBusy, setExtraBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [loc, setLoc] = useState<Loc>({ status: 'idle' })
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ pos: LatLng; label: string; checking: boolean } | null>(null)
  const originRef = useRef(origin)
  originRef.current = origin

  const query = q.trim()
  const hasQuery = typed && normalize(query).length >= MIN_CHARS

  // Pesquisa com debounce; cada nova digitação cancela a anterior.
  useEffect(() => {
    setVisible(PAGE)
    setExtra([])
    if (!hasQuery) { setOutcome(null); setSearching(false); return }
    setSearching(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const near: LatLng = me ? [me.lat, me.lng] : ARAGUATINS_CENTER
        const res = await searchPlaces(query, { near, signal: ctrl.signal, onUpdate: (o) => { if (!ctrl.signal.aborted) setOutcome(o) } })
        if (!ctrl.signal.aborted) { setOutcome(res); setSearching(false) }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') { setOutcome({ places: [], sources: { photon: 'error', overpass: 'error', nominatim: 'skipped' } }); setSearching(false) }
      }
    }, DEBOUNCE_MS)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, hasQuery, me])

  const localMatches = useMemo(() => {
    if (!hasQuery) return []
    const n = normalize(query)
    return SUGGESTED_PLACES.filter((p) => normalize(`${p.title} ${p.subtitle}`).includes(n))
  }, [query, hasQuery])

  const results = useMemo(
    () => (hasQuery ? mergePlaces([localMatches, outcome?.places ?? [], extra], query, ARAGUATINS_CENTER) : []),
    [hasQuery, localMatches, outcome, extra, query],
  )

  const choose = useCallback((p: Place) => {
    setMsg(null)
    if (pickFavorite) { setProfile({ casa: p }); showToast('Casa atualizada'); pop(); return }
    const other = focus === 'origin' ? dest : origin
    if (other && samePlace(p, other)) { setMsg('Origem e destino não podem ser o mesmo local.'); return }
    if (focus === 'origin') { setOrigin(p); setFocus('dest') } else setDest(p)
    setQ(''); setTyped(false); setOutcome(null); setExtra([])
  }, [pickFavorite, focus, dest, origin, setProfile, showToast, pop, setOrigin, setDest])

  // "Sua localização atual": posição REAL pelo navegador. Nunca assume o Centro.
  const useMyLocation = async () => {
    setMsg(null)
    setLoc({ status: 'loading' })
    try {
      const pos = await getCurrentPosition()
      await loadBoundary()
      const here: LatLng = [pos.lat, pos.lng]
      if (!insideMunicipio(here)) {
        const rev = await reverseGeocode(here).catch(() => null)
        setLoc({ status: 'outside', city: rev?.city })
        return
      }
      const first = placeFromMyPos(pos, null)
      if (dest && samePlace(first, dest)) { setLoc({ status: 'idle' }); setMsg('Você já está no destino escolhido.'); return }
      setMe(pos)
      setOrigin(first)
      setFocus('dest')
      setLoc({ status: 'idle' })
      // Nome da rua (geocodificação reversa) — atualiza sem bloquear.
      reverseGeocode(here).then((rev) => {
        if (rev && originRef.current?.id === 'gps') setOrigin(placeFromMyPos(pos, rev))
      }).catch(() => {})
    } catch (err) {
      setLoc({ status: 'error', kind: err instanceof GeoError ? err.kind : 'unavailable' })
    }
  }

  const searchOnOsm = async () => {
    setExtraBusy(true); setMsg(null)
    try {
      const r = await searchNominatim(query)
      setExtra(r)
      if (!r.length) setMsg('Não encontramos esse local em Araguatins. Tente outro endereço ou escolha o ponto no mapa.')
    } catch {
      setMsg('A busca no OpenStreetMap está indisponível agora. Escolha o ponto no mapa.')
    } finally { setExtraBusy(false) }
  }

  const openPicker = () => { setPicking(true); setPicked(null); setMsg(null); void loadBoundary() }

  const onPick = (pos: LatLng) => {
    if (!insideMunicipio(pos)) { setPicked(null); setMsg('Esse ponto está fora do município de Araguatins. Escolha um ponto dentro do contorno verde.'); return }
    setMsg(null)
    setPicked({ pos, label: 'Ponto no mapa', checking: true })
    reverseGeocode(pos).then((rev) => {
      setPicked((cur) => (cur && cur.pos === pos ? { pos, label: rev?.road ?? 'Ponto no mapa', checking: false } : cur))
    }).catch(() => setPicked((cur) => (cur && cur.pos === pos ? { ...cur, checking: false } : cur)))
  }

  const usePicked = () => {
    if (!picked) return
    choose({ id: `pin-${picked.pos[0].toFixed(5)}_${picked.pos[1].toFixed(5)}`, title: picked.label, subtitle: 'Ponto escolhido no mapa, Araguatins - TO', position: picked.pos, icon: 'pin-fill' })
    setPicking(false); setPicked(null)
  }

  const canConfirm = !!dest && !!origin && !samePlace(origin, dest)
  const photonDown = hasQuery && outcome?.sources.photon === 'error' && !results.length
  const shown = results.slice(0, visible)

  /* ---- modo: escolher no mapa ---- */
  if (picking) {
    return (
      <div className="flow">
        <ScreenHeader title="Escolher no mapa" onBack={() => { setPicking(false); setPicked(null); setMsg(null) }} />
        <p className="muted pad-x hint">Toque no mapa para marcar o ponto de {pickFavorite ? 'Casa' : focus === 'origin' ? 'partida' : 'destino'}. O contorno verde é o limite de Araguatins.</p>
        <MapPanel picking picked={picked?.pos ?? null} onPick={onPick} className="grow-map" origin={origin?.position} dest={dest?.position} me={me} />
        {!isBoundaryExact() && <p className="tiny muted pad-x">Limite municipal exato indisponível agora; usando uma área aproximada.</p>}
        <div className="footer">
          {msg && <p className="error-text">{msg}</p>}
          {picked && <p className="picked-label"><Icon name="pin-fill" size={18} className="primary" /> {picked.checking ? 'Verificando endereço…' : picked.label}</p>}
          <button className="cta" disabled={!picked} onClick={usePicked}>Usar este ponto</button>
        </div>
      </div>
    )
  }

  const fieldValue = (which: 'origin' | 'dest') => {
    if (focus === which && typed) return q
    return which === 'origin' ? origin?.title ?? '' : dest?.title ?? ''
  }

  return (
    <div className="flow">
      <ScreenHeader title={pickFavorite ? 'Endereço de Casa' : 'Seu trajeto'} onBack={pop} />

      <div className="search-card">
        {pickFavorite ? (
          <div className="field-row">
            <span className="field-ic"><Icon name="search" size={20} /></span>
            <input className="field active" aria-label="Buscar local" placeholder="Buscar rua, bairro ou local" value={q} autoFocus
              onChange={(e) => { setQ(e.target.value); setTyped(true) }} />
          </div>
        ) : (
          <div className="fields">
            <div className="rail" aria-hidden="true"><i className="dot-o" /><i className="line" /><i className="dot-d" /></div>
            <div className="field-stack">
              <input
                className={`field ${focus === 'origin' ? 'active' : ''}`} aria-label="Local de partida" placeholder="Local de partida"
                value={fieldValue('origin')}
                onFocus={(e) => { setFocus('origin'); setQ(''); setTyped(false); e.target.select() }}
                onChange={(e) => { setQ(e.target.value); setTyped(true) }}
              />
              <input
                className={`field ${focus === 'dest' ? 'active' : ''}`} aria-label="Para onde?" placeholder="Para onde?"
                value={fieldValue('dest')}
                onFocus={(e) => { setFocus('dest'); setQ(''); setTyped(false); e.target.select() }}
                onChange={(e) => { setQ(e.target.value); setTyped(true) }}
              />
            </div>
            <button className="icon-btn swap" aria-label="Inverter origem e destino" disabled={!origin || !dest} onClick={swap}><Icon name="swap" size={22} /></button>
          </div>
        )}
      </div>

      <div className="scroll search-scroll">
        {/* Ações rápidas */}
        {!pickFavorite && focus === 'origin' && (
          <button className="quick-row" onClick={useMyLocation} disabled={loc.status === 'loading'}>
            <span className="quick-ic gps"><Icon name={loc.status === 'loading' ? 'loader' : 'gps-fill'} size={22} className={loc.status === 'loading' ? 'spin' : ''} /></span>
            <span className="quick-txt"><b>Sua localização atual</b><small>{loc.status === 'loading' ? 'Obtendo sua posição…' : 'Usar o GPS deste aparelho'}</small></span>
          </button>
        )}
        {loc.status === 'error' && (
          <div className="alert-box" role="alert"><Icon name="alert" size={20} /><span>{GEO_MESSAGES[loc.kind]}</span></div>
        )}
        {loc.status === 'outside' && (
          <div className="alert-box" role="alert"><Icon name="alert" size={20} />
            <span>Você parece estar fora de Araguatins{loc.city ? ` (em ${loc.city})` : ''}. O BicoMob demonstra corridas só dentro do município. Escolha um ponto em Araguatins para experimentar.</span></div>
        )}
        <button className="quick-row" onClick={openPicker}>
          <span className="quick-ic"><Icon name="crosshair" size={22} /></span>
          <span className="quick-txt"><b>Escolher no mapa</b><small>Toque em qualquer ponto de Araguatins</small></span>
          <Icon name="chevron" size={20} className="muted" />
        </button>
        {msg && <p className="error-text pad-x">{msg}</p>}

        {/* Sugestões (sem digitar) */}
        {!hasQuery && (
          <>
            <h3 className="mini-title">Sugestões</h3>
            <ul className="results">
              {[...(profile.casa.id !== 'centro' ? [profile.casa] : []), ...SUGGESTED_PLACES].map((p) => (
                <li key={p.id}><PlaceRow p={p} onClick={() => choose(p)} /></li>
              ))}
            </ul>
            <p className="hint pad-x tiny">Digite o nome de uma rua, bairro ou estabelecimento (ex.: “escola”, “Avenida Araguaia”, “farmácia”).</p>
          </>
        )}

        {/* Resultados */}
        {hasQuery && (
          <>
            <h3 className="mini-title">{searching ? (results.length ? `Resultados para “${query}” • buscando mais…` : 'Buscando em Araguatins…') : `Resultados para “${query}”`}</h3>
            {searching && !results.length && (
              <ul className="results" aria-busy="true">{[0, 1, 2, 3].map((i) => <li key={i}><div className="skeleton" /></li>)}</ul>
            )}
            <ul className="results">
              {shown.map((p) => <li key={p.id}><PlaceRow p={p} onClick={() => choose(p)} /></li>)}
            </ul>
            {results.length > visible && (
              <button className="more-btn" onClick={() => setVisible((v) => v + PAGE)}>Mostrar mais resultados ({results.length - visible})</button>
            )}
            {!searching && !results.length && (
              <div className="no-results">
                <Icon name="search" size={30} />
                <b>{photonDown ? 'Busca online indisponível' : 'Nenhum resultado em Araguatins'}</b>
                <small>{photonDown
                  ? 'Não foi possível consultar o mapa agora. Escolha o ponto diretamente no mapa.'
                  : 'Não encontramos esse local em Araguatins. Tente um endereço diferente ou escolha no mapa.'}</small>
              </div>
            )}
            {!searching && (
              <div className="more-actions">
                <button className="pill-btn" onClick={searchOnOsm} disabled={extraBusy}>
                  <Icon name={extraBusy ? 'loader' : 'search'} size={18} className={extraBusy ? 'spin' : ''} /> Buscar também no OpenStreetMap
                </button>
                <button className="pill-btn" onClick={openPicker}><Icon name="crosshair" size={18} /> Escolher no mapa</button>
              </div>
            )}
            {outcome && outcome.sources.overpass === 'error' && outcome.sources.photon === 'ok' && (
              <p className="tiny muted pad-x">Lista de estabelecimentos (Overpass) indisponível no momento; mostrando os demais resultados.</p>
            )}
          </>
        )}
      </div>

      {!pickFavorite && (
        <div className="footer">
          <button className="cta" disabled={!canConfirm} onClick={() => push({ k: 'confirm' })}>
            {canConfirm ? 'Confirmar trajeto' : !origin ? 'Escolha o ponto de partida' : !dest ? 'Escolha o destino' : 'Confirmar trajeto'}
          </button>
        </div>
      )}
    </div>
  )
}

function PlaceRow({ p, onClick }: { p: Place; onClick: () => void }) {
  return (
    <button className="result" onClick={onClick}>
      <span className="res-ic"><PlaceIcon icon={p.icon} size={22} /></span>
      <span className="res-txt"><b>{p.title}</b><small>{p.subtitle}</small></span>
    </button>
  )
}

/* ------------------------------ Confirmar / preço ------------------------------ */
export function ConfirmScreen() {
  const { origin, dest, me, route, loadRoute, prices, iftoZone, category, setCategory, pop, push, requestRide, swap } = useStore()
  const [showBreak, setShowBreak] = useState(false)

  useEffect(() => { if (dest && origin && route.state === 'idle') loadRoute() }, [dest, origin, route.state, loadRoute])

  if (!dest || !origin) {
    return (
      <div className="flow"><ScreenHeader title="Confirmar trajeto" onBack={pop} />
        <div className="empty"><Icon name="pin-fill" size={40} /><b>Escolha partida e destino</b>
          <button className="cta" onClick={() => push({ k: 'search', focus: origin ? 'dest' : 'origin' })}>{origin ? 'Para onde?' : 'Escolher partida'}</button></div></div>
    )
  }

  const ready = route.state === 'ready'
  const data = ready ? route.data : null
  const est = data?.source === 'estimate'
  const eta = data ? Math.round(data.minutes) : 0
  const label = category === 'moto' ? 'Moto' : 'Carro'

  const card = (c: Category, name: string, desc: string, art: JSX.Element) => (
    <button className={`fare-card ${category === c ? 'sel' : ''}`} onClick={() => setCategory(c)} aria-pressed={category === c}>
      <span className="fare-art">{art}</span>
      <span className="fare-txt"><b>{name}</b><small>{desc}{iftoZone ? ' • inclui taxa IFTO' : ''}</small>{ready && <small>{eta} min</small>}</span>
      <b className="fare-price">{prices ? brl(prices[c]) : '—'}</b>
    </button>
  )

  return (
    <div className="flow">
      <ScreenHeader title="Confirmar trajeto" onBack={pop} />
      <div className="scroll">
        <div className="addr-pair static">
          <div className="addr-dots"><i className="dot-o" /><i className="line" /><i className="dot-d" /></div>
          <div className="addr-fields">
            <button className="addr-btn" onClick={() => push({ k: 'search', focus: 'origin' })}>{origin.title}</button>
            <button className="addr-btn" onClick={() => push({ k: 'search', focus: 'dest' })}>{dest.title}</button>
          </div>
          <button className="icon-btn" aria-label="Inverter origem e destino" onClick={swap}><Icon name="swap" size={22} /></button>
        </div>

        <MapPanel origin={origin.position} dest={dest.position} route={data?.coords} routeIsEstimate={est} me={me} className="map-confirm" />

        {route.state === 'loading' || route.state === 'idle' ? (
          <div className="stats"><Icon name="loader" size={20} className="spin" /> Calculando rota…</div>
        ) : (
          <>
            <div className="stats">
              <span><Icon name="route" size={20} className="primary" /> {data!.km.toFixed(1).replace('.', ',')} km</span><i />
              <span><Icon name="clock" size={20} className="primary" /> {eta} min</span>
            </div>
            <p className="muted tiny pad-x">
              {est
                ? 'Rota de demonstração — percurso viário indisponível. Distância estimada em linha reta (×1,3); linha tracejada não é um percurso por ruas.'
                : 'Distância e tempo estimados pelo serviço de rotas (OSRM). Podem variar.'}
            </p>
            {est && <button className="link pad-x" onClick={loadRoute}>Tentar rota viária novamente</button>}
          </>
        )}

        <h2 className="section-title">Escolha sua viagem</h2>
        {card('moto', 'Moto', 'Mais rápida', <MotoArt />)}
        {card('carro', 'Carro', 'Mais conforto', <CarArt />)}
        {ready && <button className="link pad-x" onClick={() => setShowBreak(true)}>Como esse preço foi calculado?</button>}
        <p className="notice"><Icon name="info" size={18} /><span>Tarifa mínima: Moto {brl(FARE_CONFIG.moto.minimum)} • Carro {brl(FARE_CONFIG.carro.minimum)}. Tarifas simuladas para apresentação. Valores não constituem oferta de transporte.</span></p>
      </div>
      <div className="footer">
        <button className="cta" disabled={!ready} onClick={requestRide}>
          {ready ? `Solicitar ${label} • ${brl(prices![category])}` : 'Calculando…'}
        </button>
      </div>

      {showBreak && data && (
        <Sheet title={`Preço — ${label}`} onClose={() => setShowBreak(false)}>
          <ul className="break">
            {fareBreakdown(category, data.km, data.minutes, iftoZone).map((l) => (
              <li key={l.label}><span>{l.label}</span><b>{brl(l.value)}</b></li>
            ))}
            <li className="total"><span>Total</span><b>{brl(prices![category])}</b></li>
          </ul>
          <p className="muted tiny">preço = max(mínima, base + km × R$/km + min × R$/min) + suplemento IFTO. Arredondado só no total.</p>
        </Sheet>
      )}
    </div>
  )
}

/* ------------------------------ Corrida ------------------------------ */
function pointAlong(coords: LatLng[], t: number): LatLng {
  if (coords.length < 2) return coords[0]
  const idx = t * (coords.length - 1)
  const i = Math.min(coords.length - 2, Math.floor(idx))
  const f = idx - i
  return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * f, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * f]
}

export function RideScreen() {
  const { activeRide: ride, advanceRide, cancelRide, finishRide, pop, push, goHome, showToast } = useStore()
  const [cancelled, setCancelled] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [chat, setChat] = useState(false)
  const [call, setCall] = useState(false)
  const [msgs, setMsgs] = useState<{ me: boolean; t: string }[]>([{ me: false, t: 'Olá! Estou a caminho do local de partida. (Mensagem simulada)' }])
  const [p, setP] = useState(0)

  const status = ride?.status
  useEffect(() => {
    setP(0)
    if (status !== 'enroute' && status !== 'inprogress') return
    const total = status === 'enroute' ? 14000 : 20000
    const start = Date.now()
    const t = window.setInterval(() => setP(Math.min(1, (Date.now() - start) / total)), 200)
    return () => window.clearInterval(t)
  }, [status, ride?.id])

  useEffect(() => { if (!ride && !cancelled) pop() }, [ride, cancelled, pop])

  if (cancelled) {
    return (
      <div className="flow"><div className="empty fill">
        <span className="cancel-ic"><Icon name="close" size={34} /></span><h2>Solicitação cancelada</h2><p className="muted">Registrada como cancelada em Atividade (apenas nesta demo).</p>
        <button className="cta" onClick={goHome}>Voltar ao início</button></div></div>
    )
  }
  if (!ride) return null

  const driverStart: LatLng = [ride.origin.position[0] + 0.005, ride.origin.position[1] + 0.007]
  let vehicle: LatLng | null = null
  if (status === 'enroute') vehicle = [driverStart[0] + (ride.origin.position[0] - driverStart[0]) * p, driverStart[1] + (ride.origin.position[1] - driverStart[1]) * p]
  else if (status === 'arrived') vehicle = ride.origin.position
  else if (status === 'inprogress') vehicle = pointAlong(ride.coords, p)

  const etaLeft = Math.max(1, Math.ceil(ride.driver.etaMin * (1 - p)))
  const title = { searching: 'Procurando motorista...', enroute: 'Seu motorista está a caminho', arrived: 'Seu motorista chegou', inprogress: 'Sua viagem está em andamento', completed: '', cancelled: '' }[status!]
  const label = ride.category === 'moto' ? 'Moto' : 'Carro'

  const doCancel = () => { cancelRide(); setConfirmCancel(false); setCancelled(true) }
  const doFinish = () => { const id = finishRide(); if (id) { pop(); push({ k: 'receipt', id }) } }
  const share = async () => {
    const text = `[SIMULAÇÃO BicoMob] ${label} de ${ride.origin.title} para ${ride.dest.title} — ${brl(ride.fare)}. Motorista fictício: ${ride.driver.name}.`
    try { await navigator.clipboard.writeText(text); showToast('Resumo simulado copiado'); return } catch { /* tenta fallback */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      const ok = document.execCommand('copy'); ta.remove()
      showToast(ok ? 'Resumo simulado copiado' : 'Não foi possível copiar nesta janela')
    } catch { showToast('Não foi possível copiar nesta janela') }
  }
  const quick = () => {
    setMsgs((m) => [...m, { me: true, t: 'Estou no local combinado.' }])
    window.setTimeout(() => setMsgs((m) => [...m, { me: false, t: 'Perfeito! (Simulação)' }]), 900)
  }

  return (
    <div className="flow ride">
      <ScreenHeader title={title} onBack={pop} />
      {status === 'enroute' && <div className="eta-chip"><Icon name="clock" size={18} /> Chega em {etaLeft} min <em>(simulado)</em></div>}
      <MapPanel origin={ride.origin.position} dest={ride.dest.position} route={ride.coords} routeIsEstimate={ride.routeSource === 'estimate'}
        vehicle={vehicle} vehicleKind={ride.category} className="map-ride" />
      <div className="sim-note">Posição do veículo ilustrativa — simulação, não é rastreamento real.</div>

      <div className="bottom-sheet">
        <div className="sheet-handle" />
        {status === 'searching' ? (
          <div className="searching">
            <div className="dots" aria-hidden="true"><i /><i /><i /></div>
            <b>Procurando motorista...</b>
            <small className="muted">Simulação — nenhum motorista real será acionado.</small>
            <button className="btn ghost wide" onClick={() => setConfirmCancel(true)}>Cancelar solicitação</button>
          </div>
        ) : (
          <>
            <div className="dest-row"><Icon name="pin-fill" size={20} className="primary" /> Destino: <b>{ride.dest.title}</b></div>
            <div className="driver">
              <Avatar name={ride.driver.name} size={58} />
              <div className="grow"><b>{ride.driver.name}</b><span className="rating"><Icon name="star" size={14} /> {ride.driver.rating.toFixed(1).replace('.', ',')}</span></div>
              <b className="fare-price">{brl(ride.fare)}</b>
            </div>
            <div className="vehicle">
              {ride.category === 'moto' ? <MotoArt className="v-art" /> : <CarArt className="v-art" />}
              <div><span>{ride.driver.vehicle} {ride.driver.color}</span>
                <span className="plate">{ride.driver.plate} <em>Simulação</em></span></div>
            </div>
            <div className="actions3">
              <button className="act" onClick={() => setCall(true)}><Icon name="phone" size={24} />Ligar</button>
              <button className="act" onClick={() => setChat(true)}><Icon name="chat" size={24} />Mensagem</button>
              <button className="act" onClick={share}><Icon name="share" size={24} />Compartilhar</button>
            </div>
            <div className="btn-row">
              {status === 'enroute' && <button className="cta" onClick={() => advanceRide('arrived')}>Simular chegada</button>}
              {status === 'arrived' && <button className="cta" onClick={() => advanceRide('inprogress')}>Iniciar viagem</button>}
              {status === 'inprogress' && <button className="cta" onClick={doFinish}>Finalizar viagem</button>}
              {status !== 'inprogress' && <button className="btn ghost" onClick={() => setConfirmCancel(true)}>Cancelar</button>}
            </div>
            <p className="safe"><Icon name="shield-fill" size={18} className="primary" /> Viagem segura com BicoMob (demonstração)</p>
          </>
        )}
      </div>

      {confirmCancel && (
        <Sheet title="Cancelar corrida?" onClose={() => setConfirmCancel(false)}>
          <p className="muted">A solicitação será registrada como cancelada somente nesta demonstração.</p>
          <div className="btn-row"><button className="btn ghost" onClick={() => setConfirmCancel(false)}>Manter</button><button className="btn danger" onClick={doCancel}>Cancelar corrida</button></div>
        </Sheet>
      )}
      {call && (
        <Sheet title="Ligar" onClose={() => setCall(false)}>
          <p className="muted">Chamadas indisponíveis nesta demonstração. Nenhum número real é acionado.</p>
          <button className="cta" onClick={() => setCall(false)}>Entendi</button>
        </Sheet>
      )}
      {chat && (
        <Sheet title={`Mensagem — ${ride.driver.name}`} onClose={() => setChat(false)}>
          <div className="chat">{msgs.map((m, i) => <p key={i} className={m.me ? 'me' : ''}>{m.t}</p>)}</div>
          <button className="pill-btn" disabled={msgs.some((m) => m.me)} onClick={quick}>Estou no local combinado.</button>
          <p className="muted tiny">Conversa simulada: nada é enviado por SMS ou WhatsApp.</p>
        </Sheet>
      )}
    </div>
  )
}

/* ------------------------------ Recibo / detalhes ------------------------------ */
const dt = (t: number) => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function RideLines({ r }: { r: Ride }) {
  return (
    <ul className="break">
      <li><span>Partida</span><b>{r.origin.title}</b></li>
      <li><span>Destino</span><b>{r.dest.title}</b></li>
      <li><span>Categoria</span><b>{r.category === 'moto' ? 'Moto' : 'Carro'}</b></li>
      <li><span>Distância</span><b>{r.km.toFixed(1).replace('.', ',')} km{r.routeSource === 'estimate' ? ' (estimada)' : ''}</b></li>
      <li><span>Duração</span><b>{Math.round(r.minutes)} min</b></li>
      <li><span>Data</span><b>{dt(r.createdAt)}</b></li>
      <li className="total"><span>Total (simulado)</span><b>{brl(r.fare)}</b></li>
    </ul>
  )
}

export function ReceiptScreen({ id }: { id: string }) {
  const { rides, rateRide, goHome, setTab } = useStore()
  const r = rides.find((x) => x.id === id)
  if (!r) return null
  return (
    <div className="flow"><div className="scroll pad">
      <div className="center"><span className="ok-ic"><Icon name="check" size={36} /></span><h1>Viagem concluída!</h1><p className="muted">Pagamento simulado — nada foi cobrado.</p></div>
      <RideLines r={r} />
      <h3 className="mini-title">Avalie o motorista (local)</h3>
      <div className="stars">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} aria-label={`${n} estrelas`} onClick={() => rateRide(r.id, n)} className={(r.rating ?? 0) >= n ? 'on' : ''}><Icon name="star" size={32} /></button>))}</div>
      <div className="btn-row"><button className="btn ghost" onClick={() => setTab('activity')}>Ver atividade</button><button className="cta" onClick={goHome}>Voltar ao início</button></div>
    </div></div>
  )
}

export function ActivityDetail({ id }: { id: string }) {
  const { rides, repeat, pop } = useStore()
  const r = rides.find((x) => x.id === id)
  if (!r) return null
  return (
    <div className="flow"><ScreenHeader title="Detalhes da viagem" onBack={pop} />
      <div className="scroll pad">
        <MapPanel origin={r.origin.position} dest={r.dest.position} route={r.coords} routeIsEstimate={r.routeSource === 'estimate'} className="map-confirm" />
        <p className="center"><em className={`badge ${r.status}`}>{r.status === 'completed' ? 'Concluída' : 'Cancelada'}</em></p>
        <RideLines r={r} />
        <button className="cta" onClick={() => repeat(r)}><Icon name="navigation" size={20} /> Repetir viagem</button>
      </div></div>
  )
}
