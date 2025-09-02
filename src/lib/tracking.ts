// src/lib/tracking.ts
// ============================================================================
// Tracking Client — Máxima performance no browser (bfcache-friendly)
// ----------------------------------------------------------------------------
// - trackView: envia pageview via sendBeacon (fallback fetch keepalive)
// - startReadTimePings: acumula tempo de leitura com pings periódicos
// - Respeita visibilitychange (só conta em foreground)
// - Usa pagehide (em vez de beforeunload) para compatibilidade com bfcache
// - sessionId estável (localStorage) com fallback para crypto.randomUUID()
// ============================================================================

export type TrackOptions = {
  endpoint?: string;            // default: /api/track/view
  oncePerDay?: boolean;         // evita duplicidade de PV por dia (default true)
  ref?: string;                 // override referrer
  utm?: Record<string, string>; // map utm_* (opcional)
  keyPrefix?: string;           // prefixo para localStorage PV
  category?: string;            // slug da categoria do post
};

function todayKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
function storageKey(postId: string, day: string, prefix = 'pv') {
  return `${prefix}:${postId}:${day}`;
}
function parseUTM(url?: string | URL | Location | null): Record<string, string> {
  try {
    const u = typeof url === 'string'
      ? new URL(url)
      : url instanceof URL
      ? url
      : new URL(String((url as Location)?.href || window.location.href));
    const p = u.searchParams;
    const out: Record<string, string> = {};
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach((k)=>{
      const v = p.get(k);
      if (v) out[k] = v;
    });
    return out;
  } catch {
    return {};
  }
}
function setLocalFlag(key: string) {
  try { localStorage.setItem(key, '1'); } catch {}
}
function hasLocalFlag(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function sendBeaconJSON(url: string, payload: any): boolean {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      return navigator.sendBeacon(url, blob);
    }
  } catch { /* noop */ }
  return false;
}
function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
  } catch { /* noop */ }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function sid(): string {
  try {
    const k = 'sid';
    let s = localStorage.getItem(k);
    if (!s) {
      s = genId();
      localStorage.setItem(k, s);
    }
    return s;
  } catch {
    // fallback volátil
    return genId();
  }
}

/**
 * Envia pageview leve (Edge collector consome país/IP via headers).
 * - Usa sendBeacon para não bloquear navegação.
 * - Opcionalmente evita duplicidade por dia (localStorage flag).
 */
export async function trackView(postId: string, locale?: string, options?: TrackOptions) {
  try {
    if (!postId || typeof window === 'undefined' || typeof document === 'undefined') return;

    const endpoint = options?.endpoint || '/api/track/view';
    const day = todayKey();
    const key = storageKey(postId, day, options?.keyPrefix || 'pv');

    if (options?.oncePerDay !== false && hasLocalFlag(key)) return;

    const payload: any = {
      postId,
      locale,
      category: options?.category || '',
      ref: options?.ref ?? document.referrer ?? '',
      utm: options?.utm || parseUTM(window.location),
      sid: sid(),
    };

    const ok = sendBeaconJSON(endpoint, payload);
    if (!ok) {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }

    if (options?.oncePerDay !== false) setLocalFlag(key);
  } catch {
    // fail-safe silencioso
  }
}

/**
 * Inicia pings de tempo de leitura (intervalo em segundos, default 15s).
 * - Conta somente quando a aba está visível (foreground).
 * - Envio via sendBeacon (fallback fetch keepalive).
 * - Usa pagehide (bfcache-friendly) para o último envio ao sair da página.
 * - Retorna função de cleanup para parar.
 */
export function startReadTimePings(
  postId: string,
  locale: string,
  category?: string,
  intervalSec = 15
) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !postId) return () => {};

  let last = Date.now();
  let visible = document.visibilityState === 'visible';
  let timer: ReturnType<typeof setInterval> | null = null;

  function send() {
    try {
      if (!visible) { last = Date.now(); return; }
      const now = Date.now();
      const ms = now - last;
      last = now;
      if (ms <= 0) return;

      const payload = { postId, locale, category, ms };
      const url = '/api/track/ping';

      if (!sendBeaconJSON(url, payload)) {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch { /* noop */ }
  }

  function onVis() {
    visible = document.visibilityState === 'visible';
    last = Date.now();
  }

  function onPageHide() {
    // Envia último ping quando a página entra em bfcache ou fecha
    send();
  }

  document.addEventListener('visibilitychange', onVis, { passive: true });
  window.addEventListener('pagehide', onPageHide, { capture: true });

  timer = setInterval(send, Math.max(5, intervalSec) * 1000);

  // cleanup
  return () => {
    try { if (timer) clearInterval(timer); } catch {}
    try { document.removeEventListener('visibilitychange', onVis); } catch {}
    try { window.removeEventListener('pagehide', onPageHide, { capture: true } as any); } catch {}
  };
}