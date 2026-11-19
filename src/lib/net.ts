// Utilitários de rede: espaçamento mínimo entre chamadas por serviço (política de uso do
// Nominatim = 1 req/s no total), cache com validade e fetch com timeout/cancelamento.

const nextSlot = new Map<string, number>()

/** Espera até o próximo "slot" livre do serviço, garantindo `gapMs` entre chamadas. Respeita abort. */
export async function throttled(service: string, gapMs: number, signal?: AbortSignal): Promise<void> {
  const now = Date.now()
  const slot = Math.max(now, nextSlot.get(service) ?? 0)
  nextSlot.set(service, slot + gapMs)
  const wait = slot - now
  if (wait <= 0) return
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, wait)
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
  })
}

export class TtlCache<V> {
  private map = new Map<string, { v: V; exp: number }>()
  constructor(private ttlMs: number, private max = 100) {}
  get(k: string): V | undefined {
    const e = this.map.get(k)
    if (!e) return undefined
    if (e.exp < Date.now()) { this.map.delete(k); return undefined }
    return e.v
  }
  set(k: string, v: V) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value as string)
    this.map.set(k, { v, exp: Date.now() + this.ttlMs })
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000, outer?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const onAbort = () => ctrl.abort()
  outer?.addEventListener('abort', onAbort, { once: true })
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', onAbort)
  }
}
