import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown, Check, Clock, Info, Loader2, MapPin, MessageCircle, Navigation, Phone, Route, Search, Share2, ShieldCheck, Star, Crosshair,
} from 'lucide-react'
import { Avatar, CarArt, MotoArt } from '../components/Art'
import MapPanel from '../components/MapPanel'
import { PlaceIcon, ScreenHeader, Sheet } from '../components/UI'
import { brl, fareBreakdown, FARE_CONFIG, type Category } from '../lib/fare'
import { haversineKm, searchCurated, type LatLng, type Place } from '../lib/places'
import { searchAddress, validateMapPoint } from '../lib/routing'
import { useStore, type Ride } from '../store'

const same = (a: Place, b: Place) => haversineKm(a.position, b.position) < 0.03

/* ------------------------------ Busca ------------------------------ */
export function SearchScreen({ focus: initialFocus, pickFavorite }: { focus: 'origin' | 'dest'; pickFavorite?: 'casa' }) {
  const { origin, dest, setOrigin, setDest, swap, pop, push, setProfile, showToast } = useStore()
  const [focus, setFocus] = useState(initialFocus)
  const [q, setQ] = useState('')
  const [typed, setTyped] = useState(false)
  const [remote, setRemote] = useState<Place[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ pos: LatLng; label: string; ok: boolean; checking: boolean } | null>(null)

  const local = useMemo(() => searchCurated(q), [q])
  const results = [...local, ...remote.filter((r) => !local.some((l) => l.id === r.id))]

  const choose = (p: Place) => {
    setMsg(null)
    if (pickFavorite) { setProfile({ casa: p }); showToast('Casa atualizada'); pop(); return }
    const other = focus === 'origin' ? dest : origin
    if (other && same(p, other)) { setMsg('Origem e destino não podem ser o mesmo local.'); return }
    if (focus === 'origin') { setOrigin(p); setFocus('dest') } else setDest(p)
    setQ(''); setTyped(false); setRemote([])
  }

  const runSearch = async () => {
    if (q.trim().length < 3) return
    setBusy(true); setMsg(null)
    try {
      const r = await searchAddress(q.trim())
      setRemote(r)
      if (!r.length && !local.length) setMsg('Não encontramos esse local em Araguatins. Tente um endereço diferente ou escolha no mapa.')
    } catch {
      setMsg('Busca de endereços indisponível agora (sem conexão ou serviço fora do ar). Use os locais sugeridos ou escolha no mapa.')
    } finally { setBusy(false) }
  }

  const onPick = async (pos: LatLng) => {
    setPicked({ pos, label: '', ok: false, checking: true })
    const v = await validateMapPoint(pos)
    if (!v.ok) { setPicked({ pos, label: '', ok: false, checking: false }); setMsg('Esse ponto está fora de Araguatins. Escolha um ponto dentro do município.'); return }
    setMsg(null)
    setPicked({ pos, label: v.label, ok: true, checking: false })
  }

  const usePicked = () => {
    if (!picked?.ok) return
    choose({ id: `pin-${picked.pos[0].toFixed(5)}_${picked.pos[1].toFixed(5)}`, title: picked.label || 'Ponto no mapa', subtitle: 'Ponto escolhido no mapa, Araguatins - TO', position: picked.pos, icon: 'pin' })
    setPicking(false); setPicked(null)
  }

  const canConfirm = !!dest && !same(origin, dest)

  if (picking) {
    return (
      <div className="flow">
        <ScreenHeader title="Escolher ponto no mapa" onBack={() => { setPicking(false); setPicked(null) }} />
        <p className="muted pad-x">Toque no mapa para marcar o ponto de {focus === 'origin' ? 'partida' : 'destino'}.</p>
        <MapPanel picking picked={picked?.pos ?? null} onPick={onPick} className="grow-map" origin={origin.position} dest={dest?.position} />
        <div className="footer">
          {msg && <p className="error-text">{msg}</p>}
          <button className="cta" disabled={!picked?.ok} onClick={usePicked}>
            {picked?.checking ? 'Verificando local…' : 'Usar este ponto'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flow">
      <ScreenHeader title={pickFavorite ? 'Escolher endereço de Casa' : 'Aonde você quer ir?'} onBack={pop} />
      <div className="scroll">
        {!pickFavorite && (
          <div className="addr-pair">
            <div className="addr-dots"><i className="dot-o" /><i className="line" /><i className="dot-d" /></div>
            <div className="addr-fields">
              <input
                className={`addr-input ${focus === 'origin' ? 'active' : ''}`} aria-label="Local de partida" placeholder="Local de partida"
                value={focus === 'origin' && typed ? q : origin.title}
                onFocus={(e) => { setFocus('origin'); setQ(''); setTyped(false); e.target.select() }} onChange={(e) => { setQ(e.target.value); setTyped(true) }}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
              <input
                className={`addr-input ${focus === 'dest' ? 'active' : ''}`} aria-label="Para onde?" placeholder="Para onde?"
                value={focus === 'dest' && typed ? q : dest?.title ?? ''}
                onFocus={(e) => { setFocus('dest'); setQ(''); setTyped(false); e.target.select() }} onChange={(e) => { setQ(e.target.value); setTyped(true) }}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </div>
            <button className="icon-btn" aria-label="Inverter origem e destino" disabled={!dest} onClick={swap}><ArrowUpDown size={20} /></button>
          </div>
        )}
        {pickFavorite && (
          <div className="addr-pair"><input className="addr-input active" aria-label="Buscar local" placeholder="Buscar local em Araguatins"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} /></div>
        )}

        <div className="search-actions">
          <button className="pill-btn" onClick={() => { setPicking(true); setPicked(null); setMsg(null) }}><Crosshair size={16} /> Escolher ponto no mapa</button>
          <button className="pill-btn" disabled={q.trim().length < 3 || busy} onClick={runSearch}>
            {busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Buscar endereço em Araguatins
          </button>
        </div>
        {msg && <p className="error-text pad-x">{msg}</p>}

        <h3 className="mini-title">{q ? 'Resultados' : 'Locais em Araguatins'} — {focus === 'origin' ? 'partida' : 'destino'}</h3>
        <ul className="results">
          {results.map((p) => (
            <li key={p.id}>
              <button className="result" onClick={() => choose(p)}>
                <span className="fav-ic"><PlaceIcon icon={p.icon} /></span>
                <span className="fav-txt"><b>{p.title}</b><small>{p.subtitle}</small></span>
              </button>
            </li>
          ))}
          {!results.length && <li className="muted pad-x">Nenhum local curado corresponde. Toque em “Buscar endereço em Araguatins”.</li>}
        </ul>
      </div>
      {!pickFavorite && (
        <div className="footer">
          <button className="cta" disabled={!canConfirm} onClick={() => push({ k: 'confirm' })}>Confirmar trajeto</button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Confirmar / preço ------------------------------ */
export function ConfirmScreen() {
  const { origin, dest, route, loadRoute, prices, iftoZone, category, setCategory, pop, push, requestRide, swap } = useStore()
  const [showBreak, setShowBreak] = useState(false)

  useEffect(() => { if (dest && route.state === 'idle') loadRoute() }, [dest, route.state, loadRoute])

  if (!dest) {
    return (
      <div className="flow"><ScreenHeader title="Confirmar trajeto" onBack={pop} />
        <div className="empty"><MapPin size={36} /><b>Escolha um destino</b>
          <button className="cta" onClick={() => push({ k: 'search', focus: 'dest' })}>Para onde?</button></div></div>
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
          <button className="icon-btn" aria-label="Inverter origem e destino" onClick={swap}><ArrowUpDown size={20} /></button>
        </div>

        <MapPanel origin={origin.position} dest={dest.position} route={data?.coords} routeIsEstimate={est} className="map-confirm" />

        {route.state === 'loading' || route.state === 'idle' ? (
          <div className="stats"><Loader2 className="spin" size={18} /> Calculando rota…</div>
        ) : (
          <>
            <div className="stats">
              <span><Route size={18} className="primary" /> {data!.km.toFixed(1).replace('.', ',')} km</span><i />
              <span><Clock size={18} className="primary" /> {eta} min</span>
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
        <p className="notice"><Info size={16} /> Tarifa mínima: Moto {brl(FARE_CONFIG.moto.minimum)} • Carro {brl(FARE_CONFIG.carro.minimum)}. Tarifas simuladas para apresentação. Valores não constituem oferta de transporte.</p>
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
        <span className="cancel-ic">✕</span><h2>Solicitação cancelada</h2><p className="muted">Registrada como cancelada em Atividade (apenas nesta demo).</p>
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
      {status === 'enroute' && <div className="eta-chip"><Clock size={16} /> Chega em {etaLeft} min <em>(simulado)</em></div>}
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
            <div className="dest-row"><MapPin size={18} className="primary" /> Destino: <b>{ride.dest.title}</b></div>
            <div className="driver">
              <Avatar name={ride.driver.name} size={58} />
              <div className="grow"><b>{ride.driver.name}</b><span className="rating"><Star size={13} fill="currentColor" /> {ride.driver.rating.toFixed(1).replace('.', ',')}</span></div>
              <b className="fare-price">{brl(ride.fare)}</b>
            </div>
            <div className="vehicle">
              {ride.category === 'moto' ? <MotoArt className="v-art" /> : <CarArt className="v-art" />}
              <div><span>{ride.driver.vehicle} {ride.driver.color}</span>
                <span className="plate">{ride.driver.plate} <em>Simulação</em></span></div>
            </div>
            <div className="actions3">
              <button className="act" onClick={() => setCall(true)}><Phone size={22} />Ligar</button>
              <button className="act" onClick={() => setChat(true)}><MessageCircle size={22} />Mensagem</button>
              <button className="act" onClick={share}><Share2 size={22} />Compartilhar</button>
            </div>
            <div className="btn-row">
              {status === 'enroute' && <button className="cta" onClick={() => advanceRide('arrived')}>Simular chegada</button>}
              {status === 'arrived' && <button className="cta" onClick={() => advanceRide('inprogress')}>Iniciar viagem</button>}
              {status === 'inprogress' && <button className="cta" onClick={doFinish}>Finalizar viagem</button>}
              {status !== 'inprogress' && <button className="btn ghost" onClick={() => setConfirmCancel(true)}>Cancelar</button>}
            </div>
            <p className="safe"><ShieldCheck size={16} className="primary" /> Viagem segura com BicoMob (demonstração)</p>
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
      <div className="center"><span className="ok-ic"><Check size={34} /></span><h1>Viagem concluída!</h1><p className="muted">Pagamento simulado — nada foi cobrado.</p></div>
      <RideLines r={r} />
      <h3 className="mini-title">Avalie o motorista (local)</h3>
      <div className="stars">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} aria-label={`${n} estrelas`} onClick={() => rateRide(r.id, n)} className={(r.rating ?? 0) >= n ? 'on' : ''}><Star size={30} fill={(r.rating ?? 0) >= n ? 'currentColor' : 'none'} /></button>))}</div>
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
        <button className="cta" onClick={() => repeat(r)}><Navigation size={18} /> Repetir viagem</button>
      </div></div>
  )
}
