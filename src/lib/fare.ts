export type Category = 'moto' | 'carro'

export interface FareConfig {
  base: number
  perKm: number
  perMinute: number
  minimum: number
  iftoFee: number
}

// Valores de SIMULAÇÃO para apresentação (docs/04). Centralizados para fácil ajuste.
export const FARE_CONFIG: Record<Category, FareConfig> = {
  moto: { base: 3.0, perKm: 1.6, perMinute: 0.15, minimum: 7.0, iftoFee: 2.5 },
  carro: { base: 5.0, perKm: 3.2, perMinute: 0.25, minimum: 13.0, iftoFee: 6.5 },
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function calculateFare(category: Category, km: number, minutes: number, isIftoZone: boolean): number {
  if (!Number.isFinite(km) || !Number.isFinite(minutes) || km < 0 || minutes <= 0) {
    throw new RangeError('Distância/duração inválidas')
  }
  const cfg = FARE_CONFIG[category]
  const raw = cfg.base + km * cfg.perKm + minutes * cfg.perMinute
  return round2(Math.max(cfg.minimum, raw) + (isIftoZone ? cfg.iftoFee : 0))
}

export interface FareLine {
  label: string
  value: number
}

export function fareBreakdown(category: Category, km: number, minutes: number, isIftoZone: boolean): FareLine[] {
  const cfg = FARE_CONFIG[category]
  const lines: FareLine[] = [
    { label: 'Tarifa base', value: cfg.base },
    { label: `Distância (${km.toFixed(1).replace('.', ',')} km × ${brl(cfg.perKm)})`, value: km * cfg.perKm },
    { label: `Tempo (${Math.round(minutes)} min × ${brl(cfg.perMinute)})`, value: minutes * cfg.perMinute },
  ]
  const raw = cfg.base + km * cfg.perKm + minutes * cfg.perMinute
  if (raw < cfg.minimum) lines.push({ label: `Ajuste à corrida mínima (${brl(cfg.minimum)})`, value: cfg.minimum - raw })
  if (isIftoZone) lines.push({ label: 'Suplemento Zona IFTO (demo)', value: cfg.iftoFee })
  return lines
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function brl(n: number): string {
  // Intl usa espaço não separável (U+00A0); normalizamos para espaço comum.
  return fmt.format(n).replace(/ /g, ' ')
}
