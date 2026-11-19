import { useState } from 'react'
import { Avatar, HeroScene, LogoMark } from '../components/Art'
import { Icon, type IconName } from '../components/Icon'
import { Sheet, Toggle } from '../components/UI'
import { brl } from '../lib/fare'
import { samePlace, type Place } from '../lib/places'
import { useStore, type AccountSub, type FavoriteKind, type Ride } from '../store'

/** Começa uma viagem para um destino. Sem partida definida, a busca pede (e tenta usar a localização). */
function useStartTrip() {
  const { origin, setDest, addRecent, push } = useStore()
  return (d: Place) => {
    setDest(d)
    addRecent(d)
    if (!origin || samePlace(origin, d)) push({ k: 'search', focus: 'dest' })
    else push({ k: 'confirm' })
  }
}

const FAVORITES: { kind: FavoriteKind; label: string; icon: IconName }[] = [
  { kind: 'home', label: 'Casa', icon: 'home-fill' },
  { kind: 'work', label: 'Trabalho', icon: 'briefcase' },
]

export function Welcome() {
  const { login } = useStore()
  return (
    <div className="screen welcome">
      <div className="welcome-top">
        <div className="brand big"><LogoMark size={46} /><span className="brand-name">BicoMob</span></div>
        <h1>Bem-vindo ao BicoMob</h1>
        <p className="muted">Sua próxima viagem começa aqui.</p>
      </div>
      <HeroScene />
      <h2 className="section-title">Escolha seu perfil</h2>
      <button className="profile-pill" onClick={login} aria-label="Perfil Cliente">
        <span className="profile-ic"><Icon name="user" size={26} /></span>
        <span>Cliente</span>
        <Icon name="chevron" size={24} className="primary" />
      </button>
      <button className="cta" onClick={login}>Entrar como Cliente</button>
      <p className="center muted small-note">
        <strong><Icon name="eye" size={16} /> Demo interativa</strong><br />Sem corridas reais, cadastro ou cobrança.
      </p>
    </div>
  )
}

export function Home() {
  const { push, profile, recents, activeRide } = useStore()
  const start = useStartTrip()
  return (
    <div className="screen">
      {activeRide && (
        <button className="active-banner" onClick={() => push({ k: 'ride' })}>
          <Icon name="navigation" size={20} /> Corrida em andamento — toque para abrir <Icon name="chevron" size={20} />
        </button>
      )}
      <div className="search-bar" role="search">
        <button className="search-main" onClick={() => push({ k: 'search', focus: 'dest' })}>
          <Icon name="search" size={24} /> <span>Para onde?</span>
        </button>
        <button className="chip-now" onClick={() => push({ k: 'search', focus: 'dest' })} aria-label="Agora">
          <Icon name="clock" size={18} /> Agora
        </button>
      </div>

      <ul className="fav-list">
        {FAVORITES.map((f) => {
          const fav = profile[f.kind]
          return (
            <li key={f.kind}>
              <button className="fav-row" onClick={() => (fav ? start(fav) : push({ k: 'search', focus: 'dest', pickFavorite: f.kind }))}>
                <span className="fav-ic"><Icon name={fav ? f.icon : 'add'} size={22} /></span>
                <span className="fav-txt"><b>{fav ? f.label : `Adicionar ${f.label}`}</b><small>{fav ? `${fav.title}${fav.subtitle ? ` • ${fav.subtitle}` : ''}` : 'Defina um endereço para acesso rápido'}</small></span>
                <Icon name="chevron" size={20} className="muted" />
              </button>
            </li>
          )
        })}
        {recents.slice(0, 2).map((p) => (
          <li key={p.id}>
            <button className="fav-row" onClick={() => start(p)}>
              <span className="fav-ic"><Icon name="history" size={22} /></span>
              <span className="fav-txt"><b>{p.title}</b><small>{p.subtitle}</small></span>
              <Icon name="chevron" size={20} className="muted" />
            </button>
          </li>
        ))}
      </ul>

    </div>
  )
}

export function Services() {
  const { push, showToast } = useStore()
  return (
    <div className="screen">
      <h1 className="page-title">Serviços</h1>
      <div className="svc-list">
        <button className="svc" onClick={() => push({ k: 'search', focus: 'dest' })}>
          <span className="svc-art ic"><Icon name="navigation" size={34} /></span><div><b>Solicitar viagem</b><small>Escolha o destino e, em seguida, o tipo de viagem</small></div><Icon name="chevron" size={20} className="muted" />
        </button>
        <button className="svc soon" onClick={() => showToast('Reservar: em breve. Ainda não disponível.')}>
          <span className="svc-art ic"><Icon name="calendar" size={34} /></span><div><b>Reservar <em className="soon-tag">Em breve</em></b><small>Agende sua corrida com antecedência</small></div>
        </button>
        <button className="svc soon" onClick={() => showToast('Entregas: em breve. Ainda não disponível.')}>
          <span className="svc-art ic"><Icon name="box" size={34} /></span><div><b>Entregas <em className="soon-tag">Em breve</em></b><small>Envie e receba encomendas</small></div>
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
        <div className="empty"><Icon name="activity" size={44} /><b>Suas viagens vão aparecer aqui</b><small>Faça uma corrida simulada para ver o histórico.</small></div>
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
        <span className="act-ic"><Icon name={r.category === 'moto' ? 'moto' : 'car'} size={24} /></span>
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
  const { push, profile, setProfile, theme, setTheme, logout, showToast, clearRides } = useStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const rows: { sub: AccountSub; icon: IconName; label: string; hint?: string }[] = [
    { sub: 'perfil', icon: 'account', label: 'Perfil' },
    { sub: 'favoritos', icon: 'star-line', label: 'Endereços favoritos' },
    { sub: 'pagamento', icon: 'wallet', label: 'Pagamento', hint: profile.payment === 'dinheiro' ? 'Dinheiro' : profile.payment === 'pix' ? 'Pix' : 'Cartão' },
    { sub: 'notificacoes', icon: 'bell', label: 'Notificações' },
    { sub: 'seguranca', icon: 'shield', label: 'Segurança' },
    { sub: 'ajuda', icon: 'help', label: 'Ajuda' },
  ]
  return (
    <div className="screen">
      <h1 className="page-title">Conta</h1>
      <div className="profile-card">
        <Avatar name={profile.name} size={60} />
        <div><b>{profile.name}</b><small>Conta de demonstração</small></div>
        <em className="badge demo">Demo</em>
      </div>
      <ul className="settings">
        {rows.map((r) => (
          <li key={r.sub}>
            <button className="set-row" onClick={() => push({ k: 'account', sub: r.sub })}>
              <span className="set-ic"><Icon name={r.icon} size={22} /></span><span className="grow">{r.label}</span>
              {r.hint && <small className="muted">{r.hint}</small>}
              <Icon name="chevron" size={20} className="muted" />
            </button>
          </li>
        ))}
        <li>
          <div className="set-row">
            <span className="set-ic"><Icon name="moon" size={22} /></span><span className="grow">Tema escuro</span>
            <Toggle label="Tema escuro" on={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} />
          </div>
        </li>
        <li>
          <button className="set-row" onClick={() => setConfirmClear(true)}>
            <span className="set-ic"><Icon name="trash" size={22} /></span><span className="grow">Limpar dados da demonstração</span>
          </button>
        </li>
        <li>
          <button className="set-row danger" onClick={() => logout()}>
            <span className="set-ic"><Icon name="logout" size={22} /></span><span className="grow">Sair da demo</span>
          </button>
        </li>
      </ul>
      <p className="center muted small-note">BicoMob • Demonstração interativa</p>
      <p className="center muted tiny credits">
        Ícones: Solar (480 Design, CC BY 4.0) e Phosphor (MIT)
      </p>
      {confirmClear && (
        <Sheet title="Limpar dados?" onClose={() => setConfirmClear(false)}>
          <p className="muted">Remove o histórico de viagens, os recentes e as preferências salvas neste navegador.</p>
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setConfirmClear(false)}>Cancelar</button>
            <button className="btn danger" onClick={() => { clearRides(); setProfile({ name: 'Cliente', payment: 'dinheiro', home: null, work: null }); setConfirmClear(false); showToast('Dados da demo limpos') }}>Limpar</button>
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
        <p className="muted small-note">Conta de demonstração. Nenhum dado pessoal real é coletado.</p>
      </div>
    )
  }
  if (sub === 'favoritos') {
    return (
      <div className="pad">
        <ul className="settings">
          {FAVORITES.map((f) => {
            const fav = profile[f.kind]
            return (
              <li key={f.kind}>
                <div className="set-row">
                  <span className="set-ic"><Icon name={f.icon} size={22} /></span>
                  <span className="grow"><b>{f.label}</b><br /><small className="muted">{fav ? fav.title : 'Não definido'}</small></span>
                  <button className="link" onClick={() => push({ k: 'search', focus: 'dest', pickFavorite: f.kind })}>{fav ? 'Alterar' : 'Definir'}</button>
                  {fav && <button className="link muted-link" onClick={() => setProfile({ [f.kind]: null })}>Remover</button>}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="muted small-note">Favoritos são endereços reais que você escolhe; ficam só neste navegador.</p>
      </div>
    )
  }
  if (sub === 'pagamento') {
    const opts: { id: 'dinheiro' | 'pix' | 'cartao'; label: string; icon: IconName }[] = [
      { id: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
      { id: 'pix', label: 'Pix', icon: 'pix' },
      { id: 'cartao', label: 'Cartão', icon: 'card' },
    ]
    return (
      <div className="pad">
        <ul className="settings">
          {opts.map((o) => (
            <li key={o.id}>
              <button className={`set-row ${profile.payment === o.id ? 'sel' : ''}`} onClick={() => setProfile({ payment: o.id })}>
                <span className="set-ic"><Icon name={o.icon} size={24} /></span><span className="grow">{o.label}</span>
                {profile.payment === o.id && <Icon name="check" size={22} className="primary" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="notice"><Icon name="info" size={18} />{PAY_INFO[profile.payment]}</p>
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
        <h3><Icon name="shield-fill" size={22} className="primary" /> Segurança na demonstração</h3>
        <ul>
          <li>Compartilhar a viagem copia apenas um resumo em texto, marcado como simulação.</li>
          <li>Sua localização real, se autorizada, fica só na memória do navegador. Ela só é usada para sugerir lugares próximos (de forma aproximada) e para descobrir o nome da rua.</li>
          <li>Não há rastreamento real, chamadas, SMS ou WhatsApp.</li>
          <li>Motoristas, placas e avaliações são fictícios.</li>
        </ul>
      </div>
    )
  }
  return (
    <div className="pad prose">
      <h3><Icon name="help" size={22} className="primary" /> Como funciona a demo</h3>
      <ol>
        <li>Toque em <b>Para onde?</b> e pesquise ruas, bairros, estabelecimentos ou endereços completos.</li>
        <li>Defina a partida: <b>Sua localização atual</b>, um endereço pesquisado ou um ponto no mapa.</li>
        <li>Confira o trajeto no mapa e escolha entre Moto, Carro ou Seu preço.</li>
        <li>Toque em <b>Solicitar</b>: um motorista fictício aceita em poucos segundos.</li>
        <li>Use <b>Simular chegada</b>, <b>Iniciar viagem</b> e <b>Finalizar viagem</b>.</li>
      </ol>
      <p className="muted">Preço = max(mínima, base + km × valor/km + minutos × valor/min). Tarifas simuladas, sem oferta real de transporte.</p>
    </div>
  )
}
