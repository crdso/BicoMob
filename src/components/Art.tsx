import type { CSSProperties } from 'react'

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 72 48" fill="none" aria-hidden="true">
      <path d="M6 30l6-15c1.4-3.4 3.6-5 7.2-5h23.6c3.6 0 5.8 1.6 7.2 5l6 15" stroke="#7FFF00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 30h66v8a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4v-2H17v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" stroke="#7FFF00" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="16" cy="29" r="3.2" fill="#7FFF00" />
      <circle cx="56" cy="29" r="3.2" fill="#7FFF00" />
      <path d="M26 22h20" stroke="#7FFF00" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="brand" style={{ fontSize: size * 0.95 }}>
      <LogoMark size={size} />
      <span className="brand-name">BicoMob</span>
    </span>
  )
}

export function CarArt({ color = '#ECEFEC', style, className }: { color?: string; style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 240 110" className={className} style={style} aria-hidden="true">
      <ellipse cx="120" cy="98" rx="98" ry="7" fill="#000" opacity=".45" />
      <path d="M18 72c0-8 4-14 12-17l30-8c10-14 22-22 38-22h26c18 0 30 9 42 23l24 6c9 2 14 8 14 18v10c0 3-2 5-5 5h-12a20 20 0 0 0-40 0H93a20 20 0 0 0-40 0H25c-4 0-7-3-7-7z" fill={color} />
      <path d="M78 47c8-11 17-17 28-17h22v17zM138 30h8c11 2 21 9 29 17h-37z" fill="#1B1F22" />
      <path d="M26 66h190" stroke="#7FFF00" strokeWidth="3" opacity=".9" />
      <g>
        <circle cx="73" cy="86" r="18" fill="#15181A" /><circle cx="73" cy="86" r="9" fill="#9AA0A4" />
        <circle cx="173" cy="86" r="18" fill="#15181A" /><circle cx="173" cy="86" r="9" fill="#9AA0A4" />
      </g>
      <rect x="212" y="62" width="9" height="5" rx="2" fill="#FFD84A" />
    </svg>
  )
}

export function MotoArt({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 240 130" className={className} style={style} aria-hidden="true">
      <ellipse cx="120" cy="118" rx="96" ry="6" fill="#000" opacity=".45" />
      <circle cx="52" cy="92" r="24" fill="#111" stroke="#7FFF00" strokeWidth="5" />
      <circle cx="190" cy="92" r="24" fill="#111" stroke="#7FFF00" strokeWidth="5" />
      <circle cx="52" cy="92" r="7" fill="#9AA0A4" /><circle cx="190" cy="92" r="7" fill="#9AA0A4" />
      <path d="M52 92l34-28h38l22-18h26l20 46" fill="none" stroke="#9AA0A4" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M80 62c8-12 20-18 34-18h26l-8 22H92z" fill="#2B3033" />
      <path d="M96 44c8-10 20-14 34-14h18l-6 14z" fill="#3A4145" />
      <path d="M150 46l18-6 8 10-18 8z" fill="#7FFF00" />
      <path d="M170 38l18-10 4 8-14 10z" fill="#1B1F22" />
      <circle cx="112" cy="84" r="12" fill="#3A4145" />
      <rect x="196" y="50" width="12" height="7" rx="3" fill="#FFD84A" />
    </svg>
  )
}

export function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-label={`Avatar ilustrativo de ${name}`}>
      {initials}
    </span>
  )
}

export function HeroScene() {
  return (
    <div className="hero" aria-hidden="true">
      <svg viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice" className="hero-bg">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2b1c" /><stop offset="1" stopColor="#0d100d" />
          </linearGradient>
        </defs>
        <rect width="360" height="190" fill="url(#sky)" />
        <g stroke="rgba(127,255,0,.10)" strokeWidth="1">
          {Array.from({ length: 10 }).map((_, i) => <path key={'h' + i} d={`M0 ${20 + i * 14}H360`} />)}
          {Array.from({ length: 14 }).map((_, i) => <path key={'v' + i} d={`M${i * 28} 0V190`} />)}
        </g>
        <path d="M-10 168h380v30H-10z" fill="#141716" />
        <path d="M0 170h360" stroke="rgba(255,255,255,.14)" strokeDasharray="14 12" />
        <path d="M26 128l42-28 30-4 24-30 36-8" fill="none" stroke="#7FFF00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="128" r="6" fill="#0B0C0D" stroke="#7FFF00" strokeWidth="3" />
        <circle cx="148" cy="58" r="5" fill="#7FFF00" />
      </svg>
      <CarArt className="hero-car" />
      <span className="hero-chip">Araguatins</span>
    </div>
  )
}
