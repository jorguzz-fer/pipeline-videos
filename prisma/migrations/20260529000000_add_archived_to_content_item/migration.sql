-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ContentItem_archived_idx" ON "ContentItem"("archived");
