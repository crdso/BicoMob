import type { CSSProperties } from 'react'
import { Icon } from './Icon'

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 72 48" fill="none" aria-hidden="true">
      <path d="M6 30l6-15c1.4-3.4 3.6-5 7.2-5h23.6c3.6 0 5.8 1.6 7.2 5l6 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 30h66v8a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4v-2H17v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="16" cy="29" r="3.2" fill="currentColor" />
      <circle cx="56" cy="29" r="3.2" fill="currentColor" />
      <path d="M26 22h20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
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

let uid = 0
export function CarArt({ color = '#EEF1EE', style, className }: { color?: string; style?: CSSProperties; className?: string }) {
  const id = `car${++uid}`
  return (
    <svg viewBox="0 0 280 120" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor={color} /><stop offset="1" stopColor="#B8BEB8" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3a45" /><stop offset="1" stopColor="#0f1519" />
        </linearGradient>
        <radialGradient id={`${id}l`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff6c8" /><stop offset="1" stopColor="#ffd84a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="108" rx="112" ry="8" fill="#000" opacity=".5" />
      {/* carroceria */}
      <path d="M16 82c0-9 4-15 13-18l36-10c9-15 24-25 42-25h30c20 0 34 9 47 24l34 8c11 3 18 10 18 21v7c0 4-3 7-7 7h-13a23 23 0 0 0-46 0H98a23 23 0 0 0-46 0H24c-5 0-8-3-8-8z" fill={`url(#${id}b)`} stroke="rgba(11,12,13,.28)" strokeWidth="1" />
      {/* vidros */}
      <path d="M86 52c8-12 19-19 33-19h26v19zM152 33h9c13 2 25 10 34 19h-43z" fill={`url(#${id}g)`} />
      <path d="M150 33v19" stroke="#c9d0c9" strokeWidth="2" />
      {/* faixa verde BicoMob */}
      <path d="M22 74h246l-6 6H30z" fill="#7FFF00" />
      <path d="M96 62l62 0" stroke="#d3d8d3" strokeWidth="1.5" opacity=".7" />
      {/* faróis */}
      <ellipse cx="268" cy="70" rx="18" ry="12" fill={`url(#${id}l)`} opacity=".8" />
      <path d="M258 66h14l-3 7h-11z" fill="#fff6c8" />
      <path d="M17 70h6v8h-6z" fill="#ff5252" />
      {/* rodas */}
      {[75, 201].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="95" r="21" fill="#101315" />
          <circle cx={cx} cy="95" r="12" fill="#aab1b6" />
          <circle cx={cx} cy="95" r="5" fill="#2a2f33" />
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M0-11V-4" transform={`translate(${cx} 95) rotate(${a})`} stroke="#2a2f33" strokeWidth="2.5" strokeLinecap="round" />
          ))}
        </g>
      ))}
    </svg>
  )
}

export function MotoArt({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 260 140" className={className} style={style} aria-hidden="true">
      <ellipse cx="130" cy="128" rx="104" ry="7" fill="#000" opacity=".5" />
      {/* rodas */}
      {[56, 206].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="100" r="26" fill="#0f1214" stroke="#7FFF00" strokeWidth="5" />
          <circle cx={cx} cy="100" r="9" fill="#aab1b6" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path key={a} d="M0-9V-23" transform={`translate(${cx} 100) rotate(${a})`} stroke="#3a4147" strokeWidth="2" />
          ))}
        </g>
      ))}
      {/* garfo e quadro */}
      <path d="M206 100l-14-48" stroke="#aab1b6" strokeWidth="6" strokeLinecap="round" />
      <path d="M56 100l38-30h42l24-18" fill="none" stroke="#c7cdd1" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      {/* motor */}
      <path d="M100 70h46l10 22h-50z" fill="#2c3236" />
      <rect x="112" y="76" width="28" height="12" rx="3" fill="#3f484e" />
      {/* tanque e banco */}
      <path d="M104 64c6-14 22-22 40-22h18l-6 22z" fill="#1c2023" />
      <path d="M118 46c8-8 20-12 32-12h14l-4 12z" fill="#7FFF00" />
      <path d="M70 62c10-6 24-8 36-6l-4 12H70z" fill="#13161a" />
      {/* farol e guidão */}
      <path d="M176 44l16-8 6 10-16 8z" fill="#7FFF00" />
      <path d="M186 32l22-10 4 8-18 10z" fill="#c7cdd1" />
      <ellipse cx="206" cy="50" rx="9" ry="6" fill="#fff6c8" />
      {/* escape */}
      <path d="M96 96h-34l-8 10h40z" fill="#8c949a" />
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

/** Tela de boas-vindas: carro em destaque sobre mapa estilizado, com rota e marcadores. */
export function HeroScene() {
  return (
    <div className="hero" aria-hidden="true">
      <svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" className="hero-bg">
        <defs>
          <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#223523" /><stop offset=".65" stopColor="#0f130f" /><stop offset="1" stopColor="#0B0C0D" />
          </linearGradient>
          <radialGradient id="hglow" cx=".62" cy=".78" r=".6">
            <stop offset="0" stopColor="#7FFF00" stopOpacity=".28" /><stop offset="1" stopColor="#7FFF00" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="230" fill="url(#hsky)" />
        <rect width="400" height="230" fill="url(#hglow)" />
        <g stroke="rgba(127,255,0,.11)" strokeWidth="1">
          {Array.from({ length: 12 }).map((_, i) => <path key={'h' + i} d={`M0 ${14 + i * 17}H400`} />)}
          {Array.from({ length: 16 }).map((_, i) => <path key={'v' + i} d={`M${i * 27} 0V230`} />)}
        </g>
        <path d="M-10 196h420v40H-10z" fill="#121514" />
        <path d="M0 200h400" stroke="rgba(255,255,255,.16)" strokeDasharray="16 12" />
        <path d="M28 150l50-34 36-6 28-36 44-10" fill="none" stroke="#7FFF00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="150" r="7" fill="#0B0C0D" stroke="#7FFF00" strokeWidth="3.5" />
      </svg>
      <span className="hero-pin"><Icon name="pin-fill" size={30} /></span>
      <CarArt className="hero-car" />
    </div>
  )
}
