// app/api/market/helsinki/route.ts
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Suprime aviso de survey
yahooFinance.suppressNotices?.(['yahooSurvey']);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IndexData = {
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
  currency: string | null;
};

type Basic = { symbol: string; name: string; changePct: number | null };

const INDEX_SYMBOL = '^OMXHPI';

// Pool curado (.HE) — inclui os nomes que você citou (Tokmanni, Afarak, Aspo, Sunborn, Norrhydro, EcoUp, Endomines, KH Group, Marimekko, Bioretec)
// e vários blue chips para garantir 5+ resultados.
const HELSINKI_POOL = [
  // Blue chips / liquidez
  'NOKIA.HE', 'KNEBV.HE', 'NESTE.HE', 'FORTUM.HE', 'UPM.HE', 'OUT1V.HE', 'NDA-FI.HE',
  'SAMPO.HE', 'ELISA.HE', 'WRT1V.HE', 'KESKOB.HE', 'TYRES.HE', 'STERV.HE', 'METSB.HE', 'ORNBV.HE', 'VALMT.HE',
  'QTCOM.HE', 'HARVIA.HE', 'PON1V.HE', 'REMEDY.HE',

  // Que você pediu (e correlatos):
  'TOKMAN.HE',   // Tokmanni Group
  'AFAGR.HE',    // Afarak Group
  'ASPO.HE',     // Aspo
  'SNI1V.HE',    // Sunborn International (ticker provável na Yahoo)
  'NORRH.HE',    // Norrhydro Group

  'ECOUP.HE',    // EcoUp
  'PAMPALO.HE',  // Endomines Finland
  'KHG.HE',      // KH Group
  'MEKKO.HE',    // Marimekko
  'BRETEC.HE',   // Bioretec
];

function safeNum(x: any): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}
function pickName(q: any): string {
  return String(q?.shortName || q?.longName || q?.symbol || '').trim();
}

async function fetchIndex(): Promise<IndexData> {
  try {
    const q: any = await yahooFinance.quote(INDEX_SYMBOL);
    return {
      symbol: INDEX_SYMBOL,
      name: 'OMX Helsinki PI',
      price: safeNum(q?.regularMarketPrice),
      changePct: safeNum(q?.regularMarketChangePercent),
      currency: (q?.currency ?? 'EUR') as string,
    };
  } catch {
    return { symbol: INDEX_SYMBOL, name: 'OMX Helsinki PI', price: null, changePct: null, currency: 'EUR' };
  }
}

async function fetchQuotesPool(symbols: string[]): Promise<any[]> {
  // Tenta batch; se falhar, cai para individual (robusto).
  try {
    const res = await yahooFinance.quote(symbols);
    if (Array.isArray(res)) return res;
    return [res].filter(Boolean);
  } catch {
    const out: any[] = [];
    for (const s of symbols) {
      try {
        const q = await yahooFinance.quote(s);
        out.push(q);
      } catch {
        // ignora ticker ruim
      }
    }
    return out;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const count = Math.max(1, Math.min(10, parseInt(searchParams.get('count') || '5', 10)));

    // 1) Índice
    const index = await fetchIndex();

    // 2) Quotes do pool (sem screener/trending)
    const quotes = await fetchQuotesPool(HELSINKI_POOL);

    const basics: Basic[] = Array.isArray(quotes)
      ? quotes.map((q: any) => ({
          symbol: String(q?.symbol || '').trim(),
          name: pickName(q),
          changePct: safeNum(q?.regularMarketChangePercent),
        }))
      : [];

    const valid = basics.filter((b) => typeof b.changePct === 'number');

    const gainersAll = valid
      .filter((b) => (b.changePct as number) > 0)
      .sort((a, b) => (b.changePct as number) - (a.changePct as number));

    const losersAll = valid
      .filter((b) => (b.changePct as number) < 0)
      .sort((a, b) => (a.changePct as number) - (b.changePct as number));

    // Cortamos o que o cliente precisar; o componente vai rotacionar localmente.
    const gainers = gainersAll.slice(0, Math.max(count, 5));
    const losers = losersAll.slice(0, Math.max(count, 5));

    return new NextResponse(
      JSON.stringify({ ok: true, ts: Date.now(), index, gainers, losers }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=120',
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}