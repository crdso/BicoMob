import { useEffect, useState, type CSSProperties } from 'react'
import { Icon, type IconName } from './components/Icon'
import { AppHeader, ScreenHeader, Toast } from './components/UI'
import { ActivityDetail, ConfirmScreen, ReceiptScreen, RideScreen, SearchScreen } from './screens/Flow'
import { Account, AccountSubScreen, Activity, Home, Services, Welcome } from './screens/Tabs'
import { useStore, type AccountSub, type Screen, type Tab } from './store'

const TABS: { id: Tab; label: string; icon: IconName; active: IconName; section: string }[] = [
  { id: 'home', label: 'Início', icon: 'home', active: 'home-fill', section: 'Corridas' },
  { id: 'services', label: 'Serviços', icon: 'services', active: 'services-fill', section: 'Serviços' },
  { id: 'activity', label: 'Atividade', icon: 'activity', active: 'activity-fill', section: 'Atividade' },
  { id: 'account', label: 'Conta', icon: 'account', active: 'account-fill', section: 'Conta' },
]
const SUB_TITLE: Record<AccountSub, string> = {
  perfil: 'Perfil', favoritos: 'Endereços favoritos', pagamento: 'Pagamento', notificacoes: 'Notificações', seguranca: 'Segurança', ajuda: 'Ajuda',
}

// Celular virtual no desktop: tela lógica de 430 × 900 (iPhone moderno) + moldura de 12 px.
// A moldura inteira é ampliada/reduzida de forma uniforme conforme a janela; o app dentro dela
// continua sendo layout responsivo real de 430 px, sem espremer componentes.
const PHONE_W = 430 + 24
const PHONE_H = 900 + 24

function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const calc = () => {
      if (window.innerWidth <= 600) { setScale(1); return }
      const s = Math.min(1.1, (window.innerHeight - 32) / PHONE_H, (window.innerWidth - 32) / PHONE_W)
      setScale(Math.max(0.5, Math.round(s * 1000) / 1000))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return scale
}

function Overlay({ s }: { s: Screen }) {
  const { pop } = useStore()
  switch (s.k) {
    case 'search': return <SearchScreen focus={s.focus} pickFavorite={s.pickFavorite} />
    case 'confirm': return <ConfirmScreen />
    case 'ride': return <RideScreen />
    case 'receipt': return <ReceiptScreen id={s.id} />
    case 'activity-detail': return <ActivityDetail id={s.id} />
    case 'account': return (
      <div className="flow"><ScreenHeader title={SUB_TITLE[s.sub]} onBack={pop} /><div className="scroll"><AccountSubScreen sub={s.sub} /></div></div>
    )
  }
}

export default function App() {
  const { logged, tab, setTab, stack, toast, profile } = useStore()
  const scale = useStageScale()
  useEffect(() => { document.documentElement.dataset.theme = profile.theme }, [profile.theme])

  const top = stack[stack.length - 1]
  const current = TABS.find((t) => t.id === tab)!

  return (
    <div className="stage" style={{ '--s': scale } as CSSProperties}>
      <div className="phone-holder">
        <div className="phone">
          <div className="phone-notch" aria-hidden="true" />
          <div className="phone-screen">
            <div className="statusbar" aria-hidden="true"><span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><span className="status-right"><Icon name="gps" size={14} /> 5G</span></div>
            {!logged ? (
              <Welcome />
            ) : top ? (
              <Overlay key={stack.length + top.k} s={top} />
            ) : (
              <>
                <AppHeader section={current.section} />
                <div className="tab-body" key={tab}>
                  {tab === 'home' && <Home />}
                  {tab === 'services' && <Services />}
                  {tab === 'activity' && <Activity />}
                  {tab === 'account' && <Account />}
                </div>
                <nav className="tabbar" aria-label="Navegação principal">
                  {TABS.map((t) => (
                    <button key={t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                      <Icon name={tab === t.id ? t.active : t.icon} size={26} /><span>{t.label}</span>
                    </button>
                  ))}
                </nav>
              </>
            )}
            <Toast msg={toast} />
          </div>
        </div>
      </div>
    </div>
  )
}
