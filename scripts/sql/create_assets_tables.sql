-- scripts/sql/create_assets_tables.sql
-- REFERÊNCIA manual (preferir Prisma Migrate)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetEntityType') THEN
    CREATE TYPE "AssetEntityType" AS ENUM ('post', 'page');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "Asset" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT NOT NULL UNIQUE,
  "key" TEXT,
  "contentType" TEXT,
  "size" INTEGER,
  "checksum" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AssetRef" (
  "id" TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "entityType" "AssetEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "AssetRef_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssetRef_asset_entity_unique"
  ON "AssetRef" ("assetId", "entityType", "entityId");

CREATE INDEX IF NOT EXISTS "AssetRef_assetId_idx" ON "AssetRef" ("assetId");
CREATE INDEX IF NOT EXISTS "AssetRef_entity_idx" ON "AssetRef" ("entityType", "entityId");