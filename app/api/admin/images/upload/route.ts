// app/api/admin/images/upload/route.ts
// ============================================================================
// Upload manual (multipart/form-data) de imagem para Vercel Blob (público).
// Espera o campo "file" no form-data.
// Opcional: se "postId" for enviado (no form), atualiza o Post.coverUrl.
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

function sanitizeName(name: string) {
  return (name || 'upload.jpg')
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

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: 'FormData ausente' }, { status: 400 });
    }

    const file = form.get('file');
    const postId = form.get('postId');
    const field = (form.get('field') as UpdatableField) || DEFAULT_FIELD;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido. Envie no campo "file".' }, { status: 400 });
    }

    if (!file.type.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `Imagem maior que o limite (${(MAX_BYTES / (1024 * 1024)) | 0} MB)` }, { status: 413 });
    }

    // Nome e chave
    const safeName = sanitizeName(file.name || 'upload.jpg');
    const fileBuf = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash('sha1').update(fileBuf).digest('hex').slice(0, 10);
    const key = `images/${Date.now()}-${hash}-${safeName}`;

    // Upload direto do Buffer
    const uploaded = await put(key, fileBuf, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Opcional: atualiza Post.coverUrl
    let saved: { postId: string; field: UpdatableField } | undefined = undefined;
    if (typeof postId === 'string' && postId) {
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { [field]: uploaded.url },
        select: { id: true },
      }).catch(() => null);
      if (updated) {
        // Sincroniza refs de assets do post (best-effort)
        try { await syncPostAssetsById(updated.id); } catch {}
        saved = { postId: updated.id, field };
      }
    }

    return NextResponse.json({ ok: true, url: uploaded.url, saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}