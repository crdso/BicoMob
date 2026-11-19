import { useState } from 'react'
import {
  Bell, Check, ChevronRight, Clock, CreditCard, HelpCircle, LogOut, MapPin, Moon, Search, ShieldCheck, Trash2,
  User, Wallet, Star, Banknote, QrCode, Navigation, Home as HomeIcon,
} from 'lucide-react'
import { Avatar, CarArt, HeroScene, LogoMark, MotoArt } from '../components/Art'
import { PlaceIcon, Sheet, Toggle } from '../components/UI'
import { brl } from '../lib/fare'
import { IFTO } from '../lib/places'
import { useStore, type AccountSub, type Ride } from '../store'

export function Welcome() {
  const { login } = useStore()
  return (
    <div className="screen welcome">
      <div className="welcome-top">
        <div className="brand big"><LogoMark size={46} /><span className="brand-name">BicoMob</span></div>
        <h1>Bem-vindo ao BicoMob</h1>
        <p className="muted">Mobilidade para Araguatins</p>
      </div>
      <HeroScene />
      <h2 className="section-title">Escolha seu perfil</h2>
      <button className="profile-pill" onClick={login} aria-label="Perfil Cliente">
        <span className="profile-ic"><User size={26} /></span>
        <span>Cliente</span>
        <ChevronRight size={22} className="primary" />
      </button>
      <button className="cta" onClick={login}>Entrar como Cliente</button>
      <p className="center muted small-note">
        <strong>Demo visual</strong><br />Experiência demonstrativa. Sem corridas reais, cadastro ou cobrança.
      </p>
      <p className="center loc"><MapPin size={16} className="primary" /> Araguatins • TO</p>
    </div>
  )
}

export function Home() {
  const { push, setDest, setOrigin, origin, profile, activeRide, setTab, setCategory } = useStore()
  const goDest = (p: typeof IFTO) => {
    setDest(p)
    if (origin.id === p.id) { push({ k: 'search', focus: 'origin' }); return }
    push({ k: 'confirm' })
  }
  const casa = profile.casa
  return (
    <div className="screen">
      {activeRide && (
        <button className="active-banner" onClick={() => push({ k: 'ride' })}>
          <Navigation size={18} /> Corrida em andamento — toque para abrir <ChevronRight size={18} />
        </button>
      )}
      <div className="search-bar" role="search">
        <button className="search-main" onClick={() => push({ k: 'search', focus: 'dest' })}>
          <Search size={22} /> <span>Para onde?</span>
        </button>
        <button className="chip-now" onClick={() => push({ k: 'search', focus: 'dest' })} aria-label="Agora">
          <Clock size={16} /> Agora
        </button>
      </div>

      <ul className="fav-list">
        <li>
          <button className="fav-row" onClick={() => goDest(casa)}>
            <span className="fav-ic"><HomeIcon size={22} /></span>
            <span className="fav-txt"><b>Casa</b><small>{casa.id === 'centro' ? 'Centro, Araguatins' : casa.title}</small></span>
            <ChevronRight size={20} className="muted" />
          </button>
        </li>
        <li>
          <button className="fav-row" onClick={() => goDest(IFTO)}>
            <span className="fav-ic"><PlaceIcon icon="graduation" /></span>
            <span className="fav-txt"><b>IFTO Campus Araguatins</b><small>Zona rural • Povoado Santa Teresa</small></span>
            <ChevronRight size={20} className="muted" />
          </button>
        </li>
      </ul>

      <div className="row-between">
        <h2 className="section-title">Sugestões</h2>
        <button className="link" onClick={() => setTab('services')}>Ver tudo</button>
      </div>
      <div className="tiles">
        <button className="tile" onClick={() => { setCategory('moto'); push({ k: 'search', focus: 'dest' }) }}><MotoArt /><span>Moto</span></button>
        <button className="tile" onClick={() => { setCategory('carro'); push({ k: 'search', focus: 'dest' }) }}><CarArt /><span>Carro</span></button>
        <button className="tile" onClick={() => { setOrigin(origin); setDest(IFTO); push({ k: 'confirm' }) }}><span className="tile-ic"><PlaceIcon icon="graduation" size={34} /></span><span>Estudante</span></button>
        <button className="tile soon" onClick={() => setTab('services')}><span className="tile-ic">🧺</span><span>Mercado</span><em>Em breve</em></button>
      </div>

      <h2 className="section-title">Mais formas de usar o BicoMob</h2>
      <div className="promos">
        <button className="promo" onClick={() => { setDest(IFTO); push({ k: 'confirm' }) }}>
          <div className="promo-art ifto"><svg viewBox="0 0 200 90" aria-hidden="true"><path d="M10 70l40-22 30 6 30-30 50-6" fill="none" stroke="#7FFF00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="70" r="5" fill="#0B0C0D" stroke="#7FFF00" strokeWidth="3" /></svg><CarArt className="promo-car" /><span className="map-chip">IFTO</span></div>
          <div className="promo-body"><b>Ir para o IFTO</b><small>Corridas mais baratas para o campus</small><ChevronRight size={18} className="primary" /></div>
        </button>
        <button className="promo" onClick={() => { setCategory('carro'); push({ k: 'search', focus: 'dest' }) }}>
          <div className="promo-art city"><CarArt className="promo-car" color="#dfe3df" /></div>
          <div className="promo-body"><b>Carro na cidade</b><small>Conforto para você e sua família</small><ChevronRight size={18} className="primary" /></div>
        </button>
      </div>
    </div>
  )
}

export function Services() {
  const { push, setDest, setCategory, showToast } = useStore()
  return (
    <div className="screen">
      <h1 className="page-title">Serviços</h1>
      <div className="svc-list">
        <button className="svc" onClick={() => { setCategory('moto'); push({ k: 'search', focus: 'dest' }) }}>
          <MotoArt className="svc-art" /><div><b>Moto</b><small>Mais rápida e econômica pela cidade</small></div><ChevronRight size={20} className="muted" />
        </button>
        <button className="svc" onClick={() => { setCategory('carro'); push({ k: 'search', focus: 'dest' }) }}>
          <CarArt className="svc-art" /><div><b>Carro</b><small>Mais conforto para até 4 pessoas</small></div><ChevronRight size={20} className="muted" />
        </button>
        <button className="svc" onClick={() => { setDest(IFTO); push({ k: 'confirm' }) }}>
          <span className="svc-art ic"><PlaceIcon icon="graduation" size={34} /></span><div><b>Estudante</b><small>Atalho para o IFTO Campus Araguatins (tarifa normal + suplemento da zona)</small></div><ChevronRight size={20} className="muted" />
        </button>
        <button className="svc soon" onClick={() => showToast('Mercado: em breve. Ainda não disponível.')}>
          <span className="svc-art ic">🧺</span><div><b>Mercado <em className="soon-tag">Em breve</em></b><small>Ainda não disponível nesta demonstração</small></div>
        </button>
      </div>
    </div>
  )
}

const dt = (t: number) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function Activity() {
  const { rides, push } = useStore()
  return (
    <div className="screen">
      <h1 className="page-title">Atividade</h1>
      {rides.length === 0 ? (
        <div className="empty"><Clock size={40} /><b>Suas viagens vão aparecer aqui</b><small>Faça uma corrida simulada para ver o histórico.</small></div>
      ) : (
        <ul className="activity-list">
          {rides.map((r) => <RideRow key={r.id} r={r} onOpen={() => push({ k: 'activity-detail', id: r.id })} />)}
        </ul>
      )}
    </div>
  )
}

function RideRow({ r, onOpen }: { r: Ride; onOpen: () => void }) {
  return (
    <li>
      <button className="act-row" onClick={onOpen}>
        <span className="act-ic">{r.category === 'moto' ? '🏍️' : '🚗'}</span>
        <span className="act-txt">
          <b>{r.dest.title}</b>
          <small>De {r.origin.title}</small>
          <small>{dt(r.createdAt)} • {r.category === 'moto' ? 'Moto' : 'Carro'}</small>
        </span>
        <span className="act-right">
          <b>{brl(r.fare)}</b>
          <em className={`badge ${r.status}`}>{r.status === 'completed' ? 'Concluída' : 'Cancelada'}</em>
        </span>
      </button>
    </li>
  )
}

const PAY_INFO = {
  dinheiro: 'O pagamento seria feito ao motorista — esta é apenas uma simulação.',
  pix: 'Pix indisponível nesta demonstração: nenhuma cobrança será realizada.',
  cartao: 'Cartões não são armazenados nem cobrados nesta demonstração.',
}

export function Account() {
  const { push, profile, setProfile, logout, showToast, clearRides } = useStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const rows: { sub: AccountSub; icon: JSX.Element; label: string; hint?: string }[] = [
    { sub: 'perfil', icon: <User size={20} />, label: 'Perfil' },
    { sub: 'favoritos', icon: <MapPin size={20} />, label: 'Endereços favoritos' },
    { sub: 'pagamento', icon: <Wallet size={20} />, label: 'Pagamento', hint: profile.payment === 'dinheiro' ? 'Dinheiro' : profile.payment === 'pix' ? 'Pix' : 'Cartão' },
    { sub: 'notificacoes', icon: <Bell size={20} />, label: 'Notificações' },
    { sub: 'seguranca', icon: <ShieldCheck size={20} />, label: 'Segurança' },
    { sub: 'ajuda', icon: <HelpCircle size={20} />, label: 'Ajuda' },
  ]
  return (
    <div className="screen">
      <h1 className="page-title">Conta</h1>
      <div className="profile-card">
        <Avatar name={profile.name} size={60} />
        <div><b>{profile.name}</b><small>Conta demo • Araguatins, TO</small></div>
        <em className="badge demo">Conta demo</em>
      </div>
      <ul className="settings">
        {rows.map((r) => (
          <li key={r.sub}>
            <button className="set-row" onClick={() => push({ k: 'account', sub: r.sub })}>
              <span className="set-ic">{r.icon}</span><span className="grow">{r.label}</span>
              {r.hint && <small className="muted">{r.hint}</small>}
              <ChevronRight size={18} className="muted" />
            </button>
          </li>
        ))}
        <li>
          <div className="set-row">
            <span className="set-ic"><Moon size={20} /></span><span className="grow">Tema escuro</span>
            <Toggle label="Tema escuro" on={profile.theme === 'dark'} onChange={(v) => setProfile({ theme: v ? 'dark' : 'light' })} />
          </div>
        </li>
        <li>
          <button className="set-row" onClick={() => setConfirmClear(true)}>
            <span className="set-ic"><Trash2 size={20} /></span><span className="grow">Limpar dados da demonstração</span>
          </button>
        </li>
        <li>
          <button className="set-row danger" onClick={() => logout()}>
            <span className="set-ic"><LogOut size={20} /></span><span className="grow">Sair da demo</span>
          </button>
        </li>
      </ul>
      <p className="center muted small-note">BicoMob • Projeto demonstrativo • Araguatins/TO</p>
      {confirmClear && (
        <Sheet title="Limpar dados?" onClose={() => setConfirmClear(false)}>
          <p className="muted">Remove o histórico de viagens e as preferências salvas neste navegador.</p>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setConfirmClear(false)}>Cancelar</button>
            <button className="btn danger" onClick={() => { clearRides(); setProfile({ name: 'Cliente', payment: 'dinheiro', theme: 'dark' }); setConfirmClear(false); showToast('Dados da demo limpos') }}>Limpar</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

export function AccountSubScreen({ sub }: { sub: AccountSub }) {
  const { profile, setProfile, showToast, push } = useStore()
  const [name, setName] = useState(profile.name)
  if (sub === 'perfil') {
    return (
      <div className="pad">
        <div className="center"><Avatar name={profile.name} size={84} /></div>
        <label className="field-label" htmlFor="nm">Nome de exibição</label>
        <input id="nm" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        <button className="cta" onClick={() => { setProfile({ name: name.trim() || 'Cliente' }); showToast('Nome salvo neste navegador') }}>Salvar</button>
        <p className="muted small-note">Conta demo. Nenhum dado pessoal real é coletado.</p>
      </div>
    )
  }
  if (sub === 'favoritos') {
    return (
      <div className="pad">
        <ul className="settings">
          <li><div className="set-row"><span className="set-ic"><HomeIcon size={20} /></span><span className="grow"><b>Casa</b><br /><small className="muted">{profile.casa.title}</small></span>
            <button className="link" onClick={() => push({ k: 'search', focus: 'dest', pickFavorite: 'casa' })}>Alterar</button></div></li>
          <li><div className="set-row"><span className="set-ic"><PlaceIcon icon="graduation" /></span><span className="grow"><b>IFTO Campus Araguatins</b><br /><small className="muted">Povoado Santa Teresa, Km 05, Zona Rural</small></span></div></li>
        </ul>
        <p className="muted small-note">“Casa” é um alias de demonstração; começa no centro e pode ser trocado por outro local de Araguatins.</p>
      </div>
    )
  }
  if (sub === 'pagamento') {
    const opts = [
      { id: 'dinheiro' as const, label: 'Dinheiro', icon: <Banknote size={22} /> },
      { id: 'pix' as const, label: 'Pix', icon: <QrCode size={22} /> },
      { id: 'cartao' as const, label: 'Cartão', icon: <CreditCard size={22} /> },
    ]
    return (
      <div className="pad">
        <ul className="settings">
          {opts.map((o) => (
            <li key={o.id}>
              <button className={`set-row ${profile.payment === o.id ? 'sel' : ''}`} onClick={() => setProfile({ payment: o.id })}>
                <span className="set-ic">{o.icon}</span><span className="grow">{o.label}</span>
                {profile.payment === o.id && <Check size={20} className="primary" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="notice">{PAY_INFO[profile.payment]}</p>
      </div>
    )
  }
  if (sub === 'notificacoes') {
    const n = profile.notifications
    const items: { k: keyof typeof n; label: string }[] = [
      { k: 'corrida', label: 'Atualizações da corrida' },
      { k: 'promo', label: 'Novidades e promoções' },
      { k: 'seguranca', label: 'Alertas de segurança' },
    ]
    return (
      <div className="pad">
        <ul className="settings">
          {items.map((i) => (
            <li key={i.k}><div className="set-row"><span className="grow">{i.label}</span>
              <Toggle label={i.label} on={n[i.k]} onChange={(v) => setProfile({ notifications: { ...n, [i.k]: v } })} /></div></li>
          ))}
        </ul>
        <p className="muted small-note">Preferências salvas só neste navegador; a demo não envia notificações.</p>
      </div>
    )
  }
  if (sub === 'seguranca') {
    return (
      <div className="pad prose">
        <h3><ShieldCheck size={20} className="primary" /> Segurança na demonstração</h3>
        <ul>
          <li>Compartilhar a viagem copia apenas um resumo em texto, marcado como simulação.</li>
          <li>Não há rastreamento real, chamadas, SMS ou WhatsApp.</li>
          <li>Motoristas, placas e avaliações são fictícios.</li>
          <li>Em um produto real, você poderia compartilhar a viagem e verificar placa e motorista antes de embarcar.</li>
        </ul>
      </div>
    )
  }
  return (
    <div className="pad prose">
      <h3><Star size={20} className="primary" /> Como funciona a demo</h3>
      <ol>
        <li>Toque em <b>Para onde?</b> ou em um destino favorito.</li>
        <li>Confira o trajeto no mapa real de Araguatins e escolha Moto ou Carro.</li>
        <li>Toque em <b>Solicitar</b>: um motorista fictício aceita em poucos segundos.</li>
        <li>Use <b>Simular chegada</b>, <b>Iniciar viagem</b> e <b>Finalizar viagem</b>.</li>
        <li>Veja o histórico em <b>Atividade</b> e repita percursos.</li>
      </ol>
      <p className="muted">Preços seguem a fórmula: base + km × valor/km + minutos × valor/min (mínima da categoria) + suplemento IFTO. Tarifas simuladas, sem oferta real de transporte.</p>
    </div>
  )
}
