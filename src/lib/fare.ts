export type Category = 'moto' | 'carro'

export interface FareConfig {
  base: number
  perKm: number
  perMinute: number
  minimum: number
}

// Valores de SIMULAÇÃO para apresentação. Centralizados para fácil ajuste.
export const FARE_CONFIG: Record<Category, FareConfig> = {
  moto: { base: 3.0, perKm: 1.6, perMinute: 0.15, minimum: 7.0 },
  carro: { base: 5.0, perKm: 3.2, perMinute: 0.25, minimum: 13.0 },
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** preço = max(mínimo, base + km × R$/km + min × R$/min), arredondado só no total. */
export function calculateFare(category: Category, km: number, minutes: number): number {
  if (!Number.isFinite(km) || !Number.isFinite(minutes) || km < 0 || minutes <= 0) {
    throw new RangeError('Distância/duração inválidas')
  }
  const cfg = FARE_CONFIG[category]
  return round2(Math.max(cfg.minimum, cfg.base + km * cfg.perKm + minutes * cfg.perMinute))
}

/**
 * Grade 3×3 de valores para "Seu preço" (simulação): 9 valores consecutivos, em passos fixos
 * (R$ 0,50 até R$ 25, R$ 1,00 acima), que SEMPRE incluem o preço sugerido e nunca ficam abaixo da
 * corrida mínima da categoria. Determinística: o mesmo trajeto gera sempre a mesma grade.
 */
export function priceOptions(suggested: number, category: Category): number[] {
  const min = FARE_CONFIG[category].minimum
  const step = suggested < 25 ? 0.5 : 1
  const below = Math.min(4, Math.max(0, Math.floor((suggested - min) / step + 1e-9)))
  const start = round2(suggested - below * step)
  return Array.from({ length: 9 }, (_, i) => round2(start + i * step))
}

export interface FareLine {
  label: string
  value: number
}

export function fareBreakdown(category: Category, km: number, minutes: number): FareLine[] {
  const cfg = FARE_CONFIG[category]
  const lines: FareLine[] = [
    { label: 'Tarifa base', value: cfg.base },
    { label: `Distância (${km.toFixed(1).replace('.', ',')} km × ${brl(cfg.perKm)})`, value: km * cfg.perKm },
    { label: `Tempo (${Math.round(minutes)} min × ${brl(cfg.perMinute)})`, value: minutes * cfg.perMinute },
  ]
  const raw = cfg.base + km * cfg.perKm + minutes * cfg.perMinute
  if (raw < cfg.minimum) lines.push({ label: `Ajuste à corrida mínima (${brl(cfg.minimum)})`, value: cfg.minimum - raw })
  return lines
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function brl(n: number): string {
  // Intl usa espaço não separável (U+00A0); normalizamos para espaço comum.
  return fmt.format(n).replace(/ /g, ' ')
}
