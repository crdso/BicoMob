import { Home as HomeIcon, LayoutGrid, ReceiptText, User } from 'lucide-react'
import { useEffect } from 'react'
import { AppHeader, ScreenHeader, Toast } from './components/UI'
import { ActivityDetail, ConfirmScreen, ReceiptScreen, RideScreen, SearchScreen } from './screens/Flow'
import { Account, AccountSubScreen, Activity, Home, Services, Welcome } from './screens/Tabs'
import { useStore, type AccountSub, type Screen, type Tab } from './store'

const TABS: { id: Tab; label: string; icon: typeof HomeIcon; section: string }[] = [
  { id: 'home', label: 'Início', icon: HomeIcon, section: 'Corridas' },
  { id: 'services', label: 'Serviços', icon: LayoutGrid, section: 'Serviços' },
  { id: 'activity', label: 'Atividade', icon: ReceiptText, section: 'Atividade' },
  { id: 'account', label: 'Conta', icon: User, section: 'Conta' },
]
const SUB_TITLE: Record<AccountSub, string> = {
  perfil: 'Perfil', favoritos: 'Endereços favoritos', pagamento: 'Pagamento', notificacoes: 'Notificações', seguranca: 'Segurança', ajuda: 'Ajuda',
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
  useEffect(() => { document.documentElement.dataset.theme = profile.theme }, [profile.theme])

  const top = stack[stack.length - 1]
  const current = TABS.find((t) => t.id === tab)!

  return (
    <div className="stage">
      <div className="phone">
        <div className="phone-notch" aria-hidden="true" />
        <div className="phone-screen">
          <div className="statusbar" aria-hidden="true"><span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><span>●●● 5G</span></div>
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
                    <t.icon size={24} /><span>{t.label}</span>
                  </button>
                ))}
              </nav>
            </>
          )}
          <Toast msg={toast} />
        </div>
      </div>
    </div>
  )
}
