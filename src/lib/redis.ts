import { Redis } from '@upstash/redis';

type RedisLike = {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, opts?: any) => Promise<any>;
  del: (key: string) => Promise<any>;
  ping?: () => Promise<string>;
};

type RedisState = 'unknown' | 'online' | 'offline';

const STUB: RedisLike = {
  async get() { return null as any; },
  async set() { return null as any; },
  async del() { return null as any; },
  async ping() { return 'stub'; },
};

// -------------------- helpers --------------------
function envBool(name: string, def = false): boolean {
  const v = process.env[name];
  if (v == null) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase());
}

function trim(s?: string | null): string {
  return String(s ?? '').trim();
}

const CONNECT_TIMEOUT_MS = Math.max(100, parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '350', 10));

// -------------------- globals por processo --------------------
const g = globalThis as any;
if (!g.__REDIS_SINGLETON__) {
  g.__REDIS_SINGLETON__ = {
    client: null as RedisLike | null,
    state: 'unknown' as RedisState,
    warned: false as boolean,
    readyPromise: null as Promise<boolean> | null,
    disabledByEnv: !envBool('REDIS_ENABLED', true),
  };
}
const S = g.__REDIS_SINGLETON__ as {
  client: RedisLike | null;
  state: RedisState;
  warned: boolean;
  readyPromise: Promise<boolean> | null;
  disabledByEnv: boolean;
};

// -------------------- ping com timeout (rápido) --------------------
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, rej) => {
    setTimeout(() => rej(new Error('timeout')), ms);
  });
}

async function quickPing(client: RedisLike): Promise<boolean> {
  try {
    if (typeof client.ping === 'function') {
      const res = await Promise.race([client.ping(), timeoutPromise(CONNECT_TIMEOUT_MS)]);
      return !!res;
    }
    const res = await Promise.race([client.get('__ping__'), timeoutPromise(CONNECT_TIMEOUT_MS)]);
    // se não explodiu, consideramos ok
    return true;
  } catch {
    return false;
  }
}

// -------------------- ensureReady: decide online/offline 1x --------------------
async function ensureReady(client: RedisLike): Promise<boolean> {
  if (S.disabledByEnv) {
    S.state = 'offline';
    return false;
  }
  if (S.state === 'online') return true;
  if (S.state === 'offline') return false;

  // unknown -> executar uma única verificação (debulking por promise global)
  if (!S.readyPromise) {
    S.readyPromise = (async () => {
      const ok = await quickPing(client);
      S.state = ok ? 'online' : 'offline';
      if (!ok && !S.warned) {
        S.warned = true;
        console.warn(`[redis] indisponível (timeout ${CONNECT_TIMEOUT_MS}ms). Usando stub em dev.`);
      }
      return ok;
    })();
  }
  try {
    const ok = await S.readyPromise;
    return ok;
  } catch {
    S.state = 'offline';
    if (!S.warned) {
      S.warned = true;
      console.warn(`[redis] indisponível (timeout ${CONNECT_TIMEOUT_MS}ms). Usando stub em dev.`);
    }
    return false;
  }
}

// -------------------- wrapper inteligente --------------------
function buildSmartWrapper(real: RedisLike): RedisLike {
  async function guard<T>(label: keyof RedisLike, op: () => Promise<T>): Promise<T> {
    const ready = await ensureReady(real);
    if (!ready) {
      // stub imediato
      const fn = (STUB as any)[label];
      return typeof fn === 'function' ? fn() : (undefined as any);
    }
    try {
      return await op();
    } catch (e: any) {
      // primeira falha em runtime -> marcar offline até reiniciar o processo
      S.state = 'offline';
      if (!S.warned) {
        S.warned = true;
        console.warn('[redis] offline em dev, usando stub (motivo):', e?.message || e);
      }
      const fn = (STUB as any)[label];
      return typeof fn === 'function' ? fn() : (undefined as any);
    }
  }

  const wrap: RedisLike = {
    async get(key) {
      return guard('get', () => real.get(key));
    },
    async set(key, value, opts?: any) {
      return guard('set', () => (real as any).set(key, value, opts));
    },
    async del(key) {
      return guard('del', () => real.del(key));
    },
    async ping() {
      if (typeof (real as any).ping === 'function') {
        return guard('ping', () => (real as any).ping());
      }
      return guard('get', async () => {
        await real.get('__ping__'); return 'ok';
      });
    },
  };

  return wrap;
}

// -------------------- criação singleton --------------------
function createClient(): RedisLike {
  // atalho por env
  if (S.disabledByEnv) {
    if (!S.warned) { S.warned = true; console.warn('[redis] desativado por REDIS_ENABLED=0 — usando stub'); }
    S.state = 'offline';
    return STUB;
  }

  const url = trim(process.env.REDIS_URL);
  const token = trim(process.env.REDIS_TOKEN);

  if (!url || !token) {
    if (!S.warned) { S.warned = true; console.warn('[redis] REDIS_URL/REDIS_TOKEN ausentes — usando stub'); }
    S.state = 'offline';
    return STUB;
  }

  // cliente real (Upstash REST)
  const real = new (Redis as any)({ url, token }) as RedisLike;
  // envolvido no wrapper inteligente
  return buildSmartWrapper(real);
}

if (!S.client) {
  S.client = createClient();
}

export const redis: RedisLike = S.client!;