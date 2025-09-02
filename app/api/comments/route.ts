// app/api/comments/route.ts
// ============================================================================
// Comments API (público) — criar e listar comentários por post
// ----------------------------------------------------------------------------
// GET  /api/comments?postId=...&page=1&perPage=20  -> lista (status=approved)
// POST /api/comments                                -> cria comentário
// Obs: Não expõe flags internas (ex.: isFake) no público.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toStr(x: any): string { return String(x ?? '').trim(); }
function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
function getIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '';
}
function fnv1aHash(s: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function hashIp(ip: string): string {
  const salt = (process.env.IP_HASH_SALT || '').trim();
  if (!ip) return '';
  return fnv1aHash(`${ip}|${salt}`);
}
function hashEmail(email?: string | null): string {
  try {
    if (!email) return '';
    const norm = String(email).trim().toLowerCase();
    return crypto.createHash('sha1').update(norm).digest('hex');
  } catch { return ''; }
}
function normalizeNick(n: string): string { return toStr(n).toLowerCase(); }
function isBlockedActive(rule: any): boolean {
  if (!rule) return false;
  if (!rule.active) return false;
  if (rule.expiresAt && new Date(rule.expiresAt).getTime() < Date.now()) return false;
  return true;
}

// Rate limit simples: 10 req / 10 min por ipHash/sid
async function rateLimit(canUseRedis: boolean, keyBase: string): Promise<boolean> {
  if (!canUseRedis) return true;
  try {
    const r = Redis.fromEnv();
    const key = `rl:comment:${keyBase}`;
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, 600);
    return count <= 10;
  } catch { return true; }
}

// GET /api/comments?postId=...&page=1&perPage=20
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = toStr(searchParams.get('postId'));
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    const page = clamp(parseInt(searchParams.get('page') || '1', 10) || 1, 1, 10_000);
    const perPage = clamp(parseInt(searchParams.get('perPage') || '20', 10) || 20, 1, 100);
    const skip = (page - 1) * perPage;

    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, status: 'approved' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        select: {
          id: true,
          displayName: true,
          content: true,
          createdAt: true,
          // isFake NÃO é selecionado/exposto no público
        },
      }),
      prisma.comment.count({ where: { postId, status: 'approved' } }),
    ]);

    const items = rows.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, page, perPage, total, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/comments  -> cria comentário (não retorna isFake ao público)
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const postId = toStr(json.postId);
    const displayName = toStr(json.displayName);
    const content = toStr(json.content);
    const email = toStr(json.email);
    const sid = toStr(json.sid);
    const honeypot = toStr(json.honeypot);

    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    if (honeypot) return NextResponse.json({ ok: true, ignored: true });
    if (displayName.length < 2 || displayName.length > 40) {
      return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
    }
    if (content.length < 2 || content.length > 2000) {
      return NextResponse.json({ error: 'Conteúdo inválido.' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, status: true } });
    if (!post || post.status !== 'published') {
      return NextResponse.json({ error: 'Post inválido' }, { status: 400 });
    }

    const ip = getIP(req);
    const ipHash = hashIp(ip);
    const emailHash = hashEmail(email);
    const nickNorm = normalizeNick(displayName);

    const rules = await prisma.blockRule.findMany({
      where: {
        active: true,
        OR: [
          { kind: 'ip', valueHash: ipHash },
          { kind: 'email', valueHash: emailHash || undefined },
          { kind: 'nick', value: nickNorm },
        ],
      },
      take: 5,
    });
    if (rules.some(isBlockedActive)) {
      return NextResponse.json({ error: 'Você está bloqueado de comentar.' }, { status: 403 });
    }

    const canUseRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
    const rlKey = ipHash || (sid ? `sid:${sid}` : '');
    const ok = await rateLimit(canUseRedis, rlKey || 'anon');
    if (!ok) return NextResponse.json({ error: 'Muitas tentativas. Aguarde e tente novamente.' }, { status: 429 });

    const safeContent = content.replace(/<script/gi, '&lt;script');

    const created = await prisma.comment.create({
      data: {
        postId,
        displayName,
        email: email || null,
        emailHash: emailHash || null,
        ipHash: ipHash || null,
        content: safeContent,
        status: 'approved',
        isFake: false,
      },
      select: { id: true, displayName: true, content: true, createdAt: true }, // não retorna isFake
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: created.id,
        displayName: created.displayName,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}