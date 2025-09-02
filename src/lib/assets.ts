// src/lib/assets.ts
import { prisma } from '@/lib/prisma';
import { del as blobDel } from '@vercel/blob';

const BLOB_HOST_SUFFIX = 'public.blob.vercel-storage.com';

function trim(s?: string | null) {
  return String(s ?? '').trim();
}

export function isVercelBlobUrl(u?: string | null) {
  try {
    if (!u) return false;
    const x = new URL(u);
    // aceita apex e subdomínios: *.public.blob.vercel-storage.com
    return x.hostname === BLOB_HOST_SUFFIX || x.hostname.endsWith(`.${BLOB_HOST_SUFFIX}`);
  } catch {
    return false;
  }
}

export function extractBlobUrls(text?: string | null): string[] {
  if (!text) return [];
  // aceita opcional subdomínio
  const re = /https?:\/\/(?:[a-z0-9-]+\.)?public\.blob\.vercel-storage\.com\/[^\s"'()<>]+/gi;
  return Array.from(new Set((text.match(re) || []).map((s) => s.trim())));
}

function keyFromUrl(u: string): string | null {
  try {
    const x = new URL(u);
    return x.pathname.replace(/^\/+/, '');
  } catch {
    return null;
  }
}

async function ensureAsset(url: string) {
  return prisma.asset.upsert({
    where: { url },
    update: {},
    create: {
      url,
      key: keyFromUrl(url) || undefined,
    },
    select: { id: true, url: true },
  });
}

async function blobDelSafe(url: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    await blobDel(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return true;
  } catch {
    return false;
  }
}

export function collectEntityBlobUrls(fields: {
  coverUrl?: string | null;
  content?: string | null;
  storyContent?: string | null;
}): string[] {
  const set = new Set<string>();
  const cover = trim(fields.coverUrl);
  if (isVercelBlobUrl(cover)) set.add(cover);
  for (const u of extractBlobUrls(fields.content)) set.add(u);
  for (const u of extractBlobUrls(fields.storyContent)) set.add(u);
  return Array.from(set);
}

/**
 * Sincroniza refs de assets (post|page) com base nos URLs atuais.
 * - Adiciona novas refs
 * - Remove refs não mais usadas
 * - GC: para assets tocados, se refCount=0, deleta do Blob e remove do DB
 */
export async function syncEntityAssetRefs(params: {
  entityType: 'post' | 'page';
  entityId: string;
  urls: string[];
}) {
  const { entityType, entityId } = params;
  const urls = Array.from(new Set(params.urls.filter(isVercelBlobUrl)));

  if (!entityId) return;

  const touchedAssetIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    const currentRefs = await tx.assetRef.findMany({
      where: { entityType, entityId },
      include: { asset: { select: { id: true, url: true } } },
    });

    const currentUrlSet = new Set(currentRefs.map((r) => r.asset.url));
    const nextUrlSet = new Set(urls);

    const toAdd = urls.filter((u) => !currentUrlSet.has(u));
    const toRemove = currentRefs.filter((r) => !nextUrlSet.has(r.asset.url));

    for (const u of toAdd) {
      const a = await ensureAsset(u);
      touchedAssetIds.add(a.id);
      await tx.assetRef.upsert({
        where: {
          assetId_entityType_entityId: {
            assetId: a.id,
            entityType,
            entityId,
          },
        } as any,
        update: {},
        create: {
          assetId: a.id,
          entityType,
          entityId,
        },
      });
    }

    if (toRemove.length) {
      await tx.assetRef.deleteMany({ where: { id: { in: toRemove.map((r) => r.id) } } });
      toRemove.forEach((r) => touchedAssetIds.add(r.assetId));
    }
  });

  if (touchedAssetIds.size) {
    const ids = Array.from(touchedAssetIds);
    const refsCount = await prisma.assetRef.groupBy({
      by: ['assetId'],
      where: { assetId: { in: ids } },
      _count: { assetId: true },
    });
    const countMap = new Map(refsCount.map((r) => [r.assetId, r._count.assetId]));

    const orphans = await prisma.asset.findMany({
      where: { id: { in: ids.filter((id) => (countMap.get(id) ?? 0) === 0) } },
      select: { id: true, url: true },
    });

    if (orphans.length) {
      await Promise.allSettled(
        orphans.map(async (a) => {
          await blobDelSafe(a.url);
          await prisma.asset.delete({ where: { id: a.id } });
        })
      );
    }
  }
}

export async function syncPostAssetsById(postId: string) {
  if (!postId) return;
  const p = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, coverUrl: true, content: true, storyContent: true },
  });
  if (!p) return;
  const urls = collectEntityBlobUrls(p);
  await syncEntityAssetRefs({ entityType: 'post', entityId: p.id, urls });
}

export async function syncPageAssetsById(pageId: string) {
  if (!pageId) return;
  const p = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, coverUrl: true, content: true },
  });
  if (!p) return;
  const urls = collectEntityBlobUrls(p);
  await syncEntityAssetRefs({ entityType: 'page', entityId: p.id, urls });
}

export async function removeRefsForEntityAndGC(entityType: 'post' | 'page', entityId: string) {
  if (!entityId) return;
  const refs = await prisma.assetRef.findMany({
    where: { entityType, entityId },
    select: { id: true, assetId: true },
  });
  if (refs.length === 0) return;

  await prisma.assetRef.deleteMany({ where: { entityType, entityId } });

  const touched = Array.from(new Set(refs.map((r) => r.assetId)));
  const refsCount = await prisma.assetRef.groupBy({
    by: ['assetId'],
    where: { assetId: { in: touched } },
    _count: { assetId: true },
  });
  const countMap = new Map(refsCount.map((r) => [r.assetId, r._count.assetId]));

  const orphans = await prisma.asset.findMany({
    where: { id: { in: touched.filter((id) => (countMap.get(id) ?? 0) === 0) } },
    select: { id: true, url: true },
  });

  if (orphans.length) {
    await Promise.allSettled(
      orphans.map(async (a) => {
        await blobDelSafe(a.url);
        await prisma.asset.delete({ where: { id: a.id } });
      })
    );
  }
}