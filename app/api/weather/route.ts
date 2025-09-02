// app/api/weather/route.ts
// ============================================================================
// Weather API (proxy/normalizer) — Open-Meteo — nível PhD
// ----------------------------------------------------------------------------
// GET /api/weather?lat=60.1699&lon=24.9384&locale=fi
// Resposta:
// {
//   ok: true,
//   data: {
//     tz: string,
//     updatedAt: string | null,
//     tempC: number | null,
//     windKmh: number | null,
//     precipMm: number | null,     // precipitação hora mais próxima
//     tMinC: number | null,
//     tMaxC: number | null,
//     precipSumMm: number | null,  // precipitação do dia
//     weatherCode: number | null   // código de condição (para ícones/tema)
//   }
// }
// ============================================================================

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toNum(v: string | null | undefined, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function timeout(ms: number) {
  return new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
}

function parseISO(s?: string | null): number | null {
  try {
    if (!s) return null;
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = toNum(searchParams.get('lat'), 60.1699);
    const lon = toNum(searchParams.get('lon'), 24.9384);

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current_weather', 'true'); // inclui temperature, windspeed e weathercode
    url.searchParams.set('hourly', 'precipitation');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'auto');

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const res = await Promise.race([
      fetch(url.toString(), { signal: controller.signal, cache: 'no-store' }),
      timeout(9000),
    ]);

    clearTimeout(t);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const json: any = await res.json();

    const tz = String(json?.timezone || '');
    const cw = json?.current_weather || {};
    const hourly = json?.hourly || {};
    const daily = json?.daily || {};

    const currentTimeISO: string | null = cw?.time ?? null;
    const currentTs = parseISO(currentTimeISO);
    const tempC: number | null = Number.isFinite(cw?.temperature) ? cw.temperature : null;
    const windKmh: number | null = Number.isFinite(cw?.windspeed) ? cw.windspeed : null;
    const weatherCode: number | null = Number.isFinite(cw?.weathercode) ? cw.weathercode : null;

    // precip “agora”: escolhe a hora mais próxima na série
    let precipMm: number | null = null;
    if (Array.isArray(hourly.time) && Array.isArray(hourly.precipitation) && currentTs !== null) {
      let bestIdx = -1;
      let bestDiff = Number.POSITIVE_INFINITY;

      for (let i = 0; i < hourly.time.length; i++) {
        const ts = parseISO(hourly.time[i]);
        if (ts === null) continue;
        const diff = Math.abs(ts - currentTs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && Number.isFinite(hourly.precipitation[bestIdx])) {
        precipMm = hourly.precipitation[bestIdx];
      }
    }

    const tMinC: number | null =
      Array.isArray(daily.temperature_2m_min) && Number.isFinite(daily.temperature_2m_min[0])
        ? daily.temperature_2m_min[0]
        : null;

    const tMaxC: number | null =
      Array.isArray(daily.temperature_2m_max) && Number.isFinite(daily.temperature_2m_max[0])
        ? daily.temperature_2m_max[0]
        : null;

    const precipSumMm: number | null =
      Array.isArray(daily.precipitation_sum) && Number.isFinite(daily.precipitation_sum[0])
        ? daily.precipitation_sum[0]
        : null;

    const body = {
      ok: true,
      data: {
        tz,
        updatedAt: currentTimeISO,
        tempC,
        windKmh,
        precipMm,
        tMinC,
        tMaxC,
        precipSumMm,
        weatherCode,
      },
    };

    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'fetch failed' },
      { status: 500 }
    );
  }
}