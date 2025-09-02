// app/api/admin/comments/route.ts
// ============================================================================
// Admin • Comments API (única rota) — listagem, ações e blocklist
// ----------------------------------------------------------------------------
// Métodos suportados:
// - GET  ?mode=comments|blocklist&status=all|approved|pending|blocked|deleted&q=...&postId=...&page=1&perPage=20&excludeDeleted=1
//        -> lista comentários (default) OU regras de bloqueio (mode=blocklist)
// - POST { action: ... } -> executa ações:
//   • { action: 'fake_create', postId, displayName, content }
//   • { action: 'approve'|'delete'|'restore'|'toggle_fake', id }
//   • { action: 'block_by_ip'|'block_by_email'|'block_by_nick', id, reason? }
//   • { action: 'blocklist_add', kind, value, reason?, expiresAt? }
//   • { action: 'blocklist_remove', id, soft?: boolean }
// ----------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Utils
function toStr(x: any): string {
  return String(x ?? '').trim();
}
function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
function normalizeNick(n: string): string {
  return toStr(n).toLowerCase();
}
function sha1(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}
function fnv1aHash(s: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function hashEmail(email?: string | null) {
  if (!email) return '';
  return sha1(String(email).trim().toLowerCase());
}
function hashIpPlain(ip: string) {
  const salt = (process.env.IP_HASH_SALT || '').trim();
  return ip ? fnv1aHash(`${ip}|${salt}`) : '';
}
function parseBool(v: string | null | undefined, def = false) {
  if (v == null || v === '') return def;
  const s = v.toLowerCase().trim();
  return ['1', 'true', 'yes', 'on'].includes(s);
}

// GET — lista comentários OU blocklist
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = (toStr(searchParams.get('mode')) || 'comments').toLowerCase();

    const page = clamp(parseInt(searchParams.get('page') || '1', 10) || 1, 1, 10_000);
    const perPage = clamp(parseInt(searchParams.get('perPage') || '20', 10) || 20, 1, 100);
    const skip = (page - 1) * perPage;

    if (mode === 'blocklist') {
      const kind = toStr(searchParams.get('kind')); // 'ip' | 'email' | 'nick' | ''
      const q = toStr(searchParams.get('q'));
      const activeParam = toStr(searchParams.get('active')); // '', '1', '0'
      const active =
        activeParam === ''
          ? undefined
          : ['1', 'true', 'yes', 'on'].includes(activeParam.toLowerCase());

      const where: any = {};
      if (kind) where.kind = kind;
      if (typeof active === 'boolean') where.active = active;
      if (q) {
        where.OR = [
          { value: { contains: q, mode: 'insensitive' as const } },
          { valueHash: { contains: q, mode: 'insensitive' as const } },
          { reason: { contains: q, mode: 'insensitive' as const } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.blockRule.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: perPage,
          select: {
            id: true,
            kind: true,
            value: true,
            valueHash: true,
            reason: true,
            active: true,
            expiresAt: true,
            createdAt: true,
          },
        }),
        prisma.blockRule.count({ where }),
      ]);

      const items = rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        value: r.value || null,
        valueHash: r.valueHash || null,
        reason: r.reason || null,
        active: !!r.active,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      }));

      return NextResponse.json({ ok: true, mode: 'blocklist', page, perPage, total, items });
    }

    // mode === 'comments'
    const status = (toStr(searchParams.get('status')) || 'all').toLowerCase();
    const postId = toStr(searchParams.get('postId'));
    const q = toStr(searchParams.get('q'));
    const excludeDeleted = parseBool(searchParams.get('excludeDeleted'), true);

    const where: any = {};
    if (postId) where.postId = postId;

    if (status && status !== 'all') {
      where.status = status;
    } else if (excludeDeleted) {
      // por padrão, não retornar "deleted"
      where.status = { not: 'deleted' };
    }

    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' as const } },
        { content: { contains: q, mode: 'insensitive' as const } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        select: {
          id: true,
          postId: true,
          displayName: true,
          content: true,
          status: true,
          isFake: true,
          email: true,
          emailHash: true,
          ipHash: true,
          createdAt: true,
          updatedAt: true,
          // @ts-ignore
          post: { select: { title: true, slug: true, category: true, locale: true } } as any,
        } as any,
      }),
      prisma.comment.count({ where }),
    ]);

    const items = rows.map((c: any) => ({
      id: c.id,
      postId: c.postId,
      post: c.post
        ? {
            title: c.post.title,
            slug: c.post.slug,
            category: c.post.category,
            locale: c.post.locale,
          }
        : null,
      displayName: c.displayName,
      content: c.content,
      status: c.status,
      isFake: !!c.isFake,
      email: c.email ? '***' : null,
      emailHash: c.emailHash || null,
      ipHash: c.ipHash || null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, mode: 'comments', page, perPage, total, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// POST — ações e criação de fake (sem alterações)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if ((session as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = toStr(body.action);

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // fake_create
    if (action === 'fake_create') {
      const postId = toStr(body.postId);
      const displayName = toStr(body.displayName || 'Admin');
      const content = toStr(body.content || '');
      if (!postId || !content) {
        return NextResponse.json({ error: 'Missing postId/content' }, { status: 400 });
      }
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      const created = await prisma.comment.create({
        data: {
          postId,
          displayName,
          content,
          status: 'approved',
          isFake: true,
          email: null,
          emailHash: null,
          ipHash: null,
        },
        select: {
          id: true, postId: true, displayName: true, content: true, status: true, isFake: true, createdAt: true,
        },
      });
      return NextResponse.json({
        ok: true,
        item: { ...created, createdAt: created.createdAt.toISOString() },
      });
    }

    const id = toStr(body.id);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const c = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, postId: true, displayName: true, email: true, emailHash: true, ipHash: true, status: true, isFake: true },
    });
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (action === 'approve') {
      const upd = await prisma.comment.update({
        where: { id },
        data: { status: 'approved' },
        select: { id: true, status: true, updatedAt: true },
      });
      return NextResponse.json({ ok: true, id: upd.id, status: upd.status, updatedAt: upd.updatedAt });
    }

    if (action === 'delete') {
      const upd = await prisma.comment.update({
        where: { id },
        data: { status: 'deleted' },
        select: { id: true, status: true, updatedAt: true },
      });
      return NextResponse.json({ ok: true, id: upd.id, status: upd.status, updatedAt: upd.updatedAt });
    }

    if (action === 'restore') {
      const upd = await prisma.comment.update({
        where: { id },
        data: { status: 'approved' },
        select: { id: true, status: true, updatedAt: true },
      });
      return NextResponse.json({ ok: true, id: upd.id, status: upd.status, updatedAt: upd.updatedAt });
    }

    if (action === 'toggle_fake') {
      const upd = await prisma.comment.update({
        where: { id },
        data: { isFake: !c.isFake },
        select: { id: true, isFake: true, updatedAt: true },
      });
      return NextResponse.json({ ok: true, id: upd.id, isFake: upd.isFake, updatedAt: upd.updatedAt });
    }

    if (action === 'block_by_ip' || action === 'block_by_email' || action === 'block_by_nick') {
      const reason = toStr(body.reason) || `auto from comment:${id}`;
      if (action === 'block_by_ip') {
        if (!c.ipHash) return NextResponse.json({ error: 'ipHash not available' }, { status: 400 });
        await prisma.blockRule.create({ data: { kind: 'ip', value: null, valueHash: c.ipHash, reason, active: true } });
      } else if (action === 'block_by_email') {
        if (!c.emailHash) return NextResponse.json({ error: 'emailHash not available' }, { status: 400 });
        await prisma.blockRule.create({ data: { kind: 'email', value: null, valueHash: c.emailHash, reason, active: true } });
      } else {
        const nick = normalizeNick(c.displayName || '');
        if (!nick) return NextResponse.json({ error: 'nickname empty' }, { status: 400 });
        await prisma.blockRule.create({ data: { kind: 'nick', value: nick, valueHash: null, reason, active: true } });
      }
      const upd = await prisma.comment.update({
        where: { id },
        data: { status: 'blocked' },
        select: { id: true, status: true, updatedAt: true },
      });
      return NextResponse.json({ ok: true, id: upd.id, status: upd.status, updatedAt: upd.updatedAt });
    }

    if (action === 'blocklist_add') {
      const kind = toStr(body.kind);
      const value = toStr(body.value);
      const reason = toStr(body.reason);
      const expiresAtRaw = toStr(body.expiresAt);
      let expiresAt: Date | null = null;
      if (expiresAtRaw) {
        const d = new Date(expiresAtRaw);
        if (Number.isFinite(+d)) expiresAt = d;
      }
      if (!['ip', 'email', 'nick'].includes(kind) || !value) {
        return NextResponse.json({ error: 'Invalid kind/value' }, { status: 400 });
      }
      if (kind === 'nick') {
        const nick = normalizeNick(value);
        const rule = await prisma.blockRule.create({
          data: { kind: 'nick', value: nick, valueHash: null, reason: reason || null, active: true, expiresAt },
        });
        return NextResponse.json({ ok: true, rule });
      } else if (kind === 'email') {
        const valueHash = hashEmail(value);
        const rule = await prisma.blockRule.create({
          data: { kind: 'email', value: null, valueHash, reason: reason || null, active: true, expiresAt },
        });
        return NextResponse.json({ ok: true, rule });
      } else {
        const valueHash = hashIpPlain(value);
        const rule = await prisma.blockRule.create({
          data: { kind: 'ip', value: null, valueHash, reason: reason || null, active: true, expiresAt },
        });
        return NextResponse.json({ ok: true, rule });
      }
    }

    if (action === 'blocklist_remove') {
      const rid = toStr(body.id);
      const soft = !!body.soft;
      if (!rid) return NextResponse.json({ error: 'Missing blockRule id' }, { status: 400 });
      if (soft) {
        const rule = await prisma.blockRule.update({
          where: { id: rid },
          data: { active: false },
          select: { id: true, active: true },
        });
        return NextResponse.json({ ok: true, rule });
      }
      await prisma.blockRule.delete({ where: { id: rid } });
      return NextResponse.json({ ok: true, removed: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}