-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('draft', 'published', 'scheduled');

-- CreateEnum
CREATE TYPE "public"."PageStatus" AS ENUM ('draft', 'published', 'scheduled');

-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('approved', 'pending', 'blocked', 'deleted');

-- CreateEnum
CREATE TYPE "public"."BlockRuleKind" AS ENUM ('ip', 'email', 'nick');

-- CreateEnum
CREATE TYPE "public"."AssetEntityType" AS ENUM ('post', 'page');

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverUrl" TEXT,
    "excerpt" TEXT,
    "content" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "public"."PostStatus" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "focusKeyphrase" TEXT,
    "indexable" BOOLEAN NOT NULL DEFAULT true,
    "follow" BOOLEAN NOT NULL DEFAULT true,
    "isWebStory" BOOLEAN NOT NULL DEFAULT false,
    "storyContent" TEXT,
    "storyOptions" JSONB,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "emailHash" TEXT,
    "ipHash" TEXT,
    "content" TEXT NOT NULL,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'approved',
    "isFake" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Page" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "coverUrl" TEXT,
    "status" "public"."PageStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "indexable" BOOLEAN NOT NULL DEFAULT true,
    "follow" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItem" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FooterGroup" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FooterLink" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "rel" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlockRule" (
    "id" TEXT NOT NULL,
    "kind" "public"."BlockRuleKind" NOT NULL,
    "value" TEXT,
    "valueHash" TEXT,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL,
    "siteName" JSONB NOT NULL,
    "titleTemplate" JSONB NOT NULL,
    "defaultMetaDescription" JSONB,
    "defaultMetaImage" TEXT,
    "siteUrl" TEXT,
    "logoUrl" TEXT,
    "twitterHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UITranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UITranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "contentType" TEXT,
    "size" INTEGER,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssetRef" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "entityType" "public"."AssetEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_locale_status_publishedAt_idx" ON "public"."Post"("locale", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "public"."Post"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Post_locale_slug_key" ON "public"."Post"("locale", "slug");

-- CreateIndex
CREATE INDEX "Comment_postId_status_createdAt_idx" ON "public"."Comment"("postId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_emailHash_idx" ON "public"."Comment"("emailHash");

-- CreateIndex
CREATE INDEX "Comment_ipHash_idx" ON "public"."Comment"("ipHash");

-- CreateIndex
CREATE INDEX "Page_locale_status_updatedAt_idx" ON "public"."Page"("locale", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Page_locale_path_key" ON "public"."Page"("locale", "path");

-- CreateIndex
CREATE INDEX "Category_locale_order_idx" ON "public"."Category"("locale", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Category_locale_slug_key" ON "public"."Category"("locale", "slug");

-- CreateIndex
CREATE INDEX "MenuItem_locale_order_idx" ON "public"."MenuItem"("locale", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_locale_href_key" ON "public"."MenuItem"("locale", "href");

-- CreateIndex
CREATE INDEX "FooterGroup_locale_order_idx" ON "public"."FooterGroup"("locale", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FooterGroup_locale_title_key" ON "public"."FooterGroup"("locale", "title");

-- CreateIndex
CREATE INDEX "FooterLink_groupId_order_idx" ON "public"."FooterLink"("groupId", "order");

-- CreateIndex
CREATE INDEX "BlockRule_active_kind_idx" ON "public"."BlockRule"("active", "kind");

-- CreateIndex
CREATE INDEX "BlockRule_valueHash_idx" ON "public"."BlockRule"("valueHash");

-- CreateIndex
CREATE INDEX "BlockRule_value_idx" ON "public"."BlockRule"("value");

-- CreateIndex
CREATE INDEX "UITranslation_locale_namespace_idx" ON "public"."UITranslation"("locale", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "UITranslation_locale_namespace_key" ON "public"."UITranslation"("locale", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_url_key" ON "public"."Asset"("url");

-- CreateIndex
CREATE INDEX "AssetRef_assetId_idx" ON "public"."AssetRef"("assetId");

-- CreateIndex
CREATE INDEX "AssetRef_entityType_entityId_idx" ON "public"."AssetRef"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRef_assetId_entityType_entityId_key" ON "public"."AssetRef"("assetId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FooterLink" ADD CONSTRAINT "FooterLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."FooterGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetRef" ADD CONSTRAINT "AssetRef_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
