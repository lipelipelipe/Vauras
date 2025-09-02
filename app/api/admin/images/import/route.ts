// app/api/admin/images/import/route.ts
// ============================================================================
// Importa uma imagem de uma URL externa e salva no Vercel Blob (público).
// Opcional: se "postId" for enviado, atualiza o Post.coverUrl no banco.
// Segurança: admin (NextAuth).
// Requisitos:
// - npm i @vercel/blob
// - Env: BLOB_READ_WRITE_TOKEN
// - next.config.mjs: liberar host do Blob (ex.: public.blob.vercel-storage.com)
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import { syncPostAssetsById } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const DEFAULT_FIELD = 'coverUrl' as const;

type UpdatableField = typeof DEFAULT_FIELD;

function isValidHttpUrl(u?: string): boolean {
  try {
    if (!u) return false;
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:';
  } catch {
    return false;
  }
}

function extFromContentType(ct?: string): string {
  if (!ct) return '';
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return map[ct.toLowerCase()] || '';
}

function sanitizeName(name: string) {
  return (name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9\.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: Request) {
  try {
    // Auth (Admin)
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || 'guest';
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Missing BLOB_READ_WRITE_TOKEN' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { url, fileName, postId, field }: { url?: string; fileName?: string; postId?: string; field?: UpdatableField } = body;

    if (!isValidHttpUrl(url)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Baixa a imagem
    const res = await fetch(url!, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Falha ao baixar imagem: HTTP ${res.status}` }, { status: 400 });
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) {
      return NextResponse.json({ error: 'Conteúdo baixado não é uma imagem' }, { status: 400 });
    }

    const contentLength = Number(res.headers.get('content-length') || '0');
    if (contentLength && contentLength > MAX_BYTES) {
      return NextResponse.json({ error: `Imagem maior que o limite (${(MAX_BYTES / (1024 * 1024)) | 0} MB)` }, { status: 413 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: `Imagem maior que o limite (${(MAX_BYTES / (1024 * 1024)) | 0} MB)` }, { status: 413 });
    }

    // Define nome e extensão
    const urlObj = new URL(url!);
    const urlBase = sanitizeName(urlObj.pathname.split('/').pop() || 'image');
    const baseName = sanitizeName(fileName || urlBase) || 'image';
    const extByCT = extFromContentType(ct);
    const hasExt = /\.[a-z0-9]+$/i.test(baseName);
    const finalName = hasExt ? baseName : (extByCT ? `${baseName}.${extByCT}` : `${baseName}.jpg`);

    // chave com hash (para dedup parcial)
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
    const key = `images/${Date.now()}-${hash}-${finalName}`;

    // Upload no Blob (público)
    const uploaded = await put(key, buf, {
      access: 'public',
      contentType: ct,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Opcional: salva no banco no campo escolhido (apenas coverUrl por enquanto)
    let saved: { postId: string; field: UpdatableField } | undefined = undefined;
    const targetField = (field || DEFAULT_FIELD) as UpdatableField;

    if (postId && typeof postId === 'string') {
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { [targetField]: uploaded.url },
        select: { id: true },
      }).catch(() => null);

      if (updated) {
        // Sincroniza refs de assets do post (best-effort)
        try { await syncPostAssetsById(updated.id); } catch {}
        saved = { postId: updated.id, field: targetField };
      } else {
        saved = undefined;
      }
    }

    return NextResponse.json({ ok: true, url: uploaded.url, saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}