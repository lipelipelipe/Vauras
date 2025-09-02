// app/api/admin/blob/maintenance/route.ts
// ============================================================================
// Admin • Blob Maintenance (sync + gc) — nível PhD
// ----------------------------------------------------------------------------
// Ações (POST):
// - action=sync         → Ressincroniza refs de todos os posts e páginas.
// - action=gc           → Varre o storage por prefix e apaga arquivos sem Asset no DB.
//   • dryRun=1          → não apaga (apenas relata).
//   • dbOrphans=1       → além do storage, apaga Assets do DB que não têm refs (e tenta deletar do Blob).
//   • prefix=images/    → prefixo a varrer no storage (default: images/)
// ----------------------------------------------------------------------------
// Segurança: admin (NextAuth).
// ============================================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { list, del } from '@vercel/blob';
import { syncPostAssetsById, syncPageAssetsById } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function boolQP(v: string | null, def = false) {
  if (!v) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

// Tipagem mínima do retorno do list() que precisamos (url e cursor)
type BlobListItem = { url: string };
type VercelBlobList = { blobs: BlobListItem[]; cursor?: string | null };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  if ((session as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'sync';
  const dryRun = boolQP(url.searchParams.get('dryRun'), false);
  const dbOrphans = boolQP(url.searchParams.get('dbOrphans'), false);
  const prefix = url.searchParams.get('prefix') || 'images/';

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Missing BLOB_READ_WRITE_TOKEN' }, { status: 500 });
  }

  try {
    if (action === 'sync') {
      const [posts, pages] = await Promise.all([
        prisma.post.findMany({ select: { id: true }, take: 10000 }),
        prisma.page.findMany({ select: { id: true }, take: 10000 }),
      ]);

      let syncedPosts = 0;
      let syncedPages = 0;
      for (const p of posts) {
        await syncPostAssetsById(p.id);
        syncedPosts++;
      }
      for (const pg of pages) {
        await syncPageAssetsById(pg.id);
        syncedPages++;
      }

      return NextResponse.json({ ok: true, action: 'sync', syncedPosts, syncedPages });
    }

    if (action === 'gc') {
      // 1) Varre o storage pelo prefix para encontrar arquivos que não existem no DB (sem Asset)
      let cursor: string | undefined = undefined;
      let scanned = 0;
      let orphaned = 0;
      let deleted = 0;
      const sample: string[] = [];

      do {
        const res = (await list({
          token: process.env.BLOB_READ_WRITE_TOKEN!,
          cursor,
          prefix,
        })) as unknown as VercelBlobList;

        cursor = res.cursor ?? undefined;

        const urls: string[] = res.blobs.map((b: BlobListItem) => b.url);
        scanned += urls.length;

        if (urls.length) {
          const assets = await prisma.asset.findMany({
            where: { url: { in: urls } },
            select: { url: true },
          });
          const inDb = new Set<string>(assets.map((a) => a.url));
          const missing = urls.filter((u: string) => !inDb.has(u));

          for (const u of missing) {
            orphaned++;
            if (sample.length < 10) sample.push(u);
            if (!dryRun) {
              try {
                await del(u, { token: process.env.BLOB_READ_WRITE_TOKEN! });
                deleted++;
              } catch {
                // ignore falhas individuais
              }
            }
          }
        }
      } while (cursor);

      // 2) (opcional) GC via DB: assets com 0 refs (Asset sem AssetRef)
      let dbOrphansDeleted = 0;
      let dbOrphansCount = 0;
      if (dbOrphans) {
        const rows = await prisma.$queryRaw<{ id: string; url: string }[]>`
          SELECT "Asset"."id", "Asset"."url"
          FROM "Asset"
          LEFT JOIN "AssetRef" ON "AssetRef"."assetId" = "Asset"."id"
          WHERE "AssetRef"."assetId" IS NULL
        `;
        dbOrphansCount = rows.length;

        if (!dryRun && rows.length) {
          for (const a of rows) {
            try {
              await del(a.url, { token: process.env.BLOB_READ_WRITE_TOKEN! }).catch(() => null);
              await prisma.asset.delete({ where: { id: a.id } });
              dbOrphansDeleted++;
            } catch {
              // ignore
            }
          }
        }
      }

      return NextResponse.json({
        ok: true,
        action: 'gc',
        prefix,
        dryRun,
        scanned,
        orphanedFromStorage: orphaned,
        storageDeleted: dryRun ? 0 : deleted,
        dbOrphans: dbOrphans ? dbOrphansCount : undefined,
        dbOrphansDeleted: dbOrphans ? (dryRun ? 0 : dbOrphansDeleted) : undefined,
        sample,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}