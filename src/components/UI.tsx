import { ArrowLeft, GraduationCap, Home, MapPin, Hospital, Trees, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Place } from '../lib/places'
import { BrandLogo } from './Art'

export function AppHeader({ section }: { section?: string }) {
  return (
    <header className="app-header">
      <BrandLogo size={26} />
      {section && <span className="header-sep" />}
      {section && <span className="header-section">{section}</span>}
      <span className="demo-badge">Demo</span>
    </header>
  )
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="screen-header">
      <button className="icon-btn" onClick={onBack} aria-label="Voltar"><ArrowLeft size={22} /></button>
      <h1>{title}</h1>
      {right}
    </div>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn small" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PlaceIcon({ icon, size = 20 }: { icon: Place['icon']; size?: number }) {
  const I = icon === 'house' ? Home : icon === 'graduation' ? GraduationCap : icon === 'hospital' ? Hospital : icon === 'park' ? Trees : MapPin
  return <I size={size} />
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

export function Toast({ msg }: { msg: string | null }) {
  return msg ? <div className="toast" role="status">{msg}</div> : null
}
