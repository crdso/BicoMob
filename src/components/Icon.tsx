import 'iconify-icon'
import { addCollection } from 'iconify-icon'
import type { CSSProperties } from 'react'
import bundle from '../icons/bundle.json'
import iconMap from '../icons/icon-map.json'

// Registra os dados dos ícones (gerados por `npm run icons`) para funcionar offline.
let registered = false
function register() {
  if (registered) return
  registered = true
  for (const c of bundle as unknown as Parameters<typeof addCollection>[0][]) addCollection(c)
}
register()

// Tipagem do Web Component oficial no JSX do React.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        icon?: string
        // React 18 repassa props de elementos customizados como atributos: o HTML usa `class`.
        class?: string
        noobserver?: string
        width?: number | string
        height?: number | string
        flip?: string
        rotate?: number | string
        inline?: boolean | string
      }
    }
  }
}

export type IconName = keyof typeof iconMap

// Aceita nomes antigos/desconhecidos (ex.: locais salvos em versões anteriores) sem quebrar.
const resolve = (name: string): string => (iconMap as Record<string, string>)[name] ?? iconMap['pin-fill']

export function Icon({ name, size = 22, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  // `noobserver`: renderiza na hora, sem esperar o ícone entrar na área visível (os dados já estão empacotados).
  return <iconify-icon icon={resolve(name)} width={size} height={size} class={className} style={style} noobserver="true" aria-hidden="true" />
}

/** HTML do ícone para uso em strings (ex.: L.divIcon do Leaflet). */
export function iconHtml(name: IconName, size = 18): string {
  return `<iconify-icon icon="${iconMap[name]}" width="${size}" height="${size}" noobserver="true"></iconify-icon>`
}
