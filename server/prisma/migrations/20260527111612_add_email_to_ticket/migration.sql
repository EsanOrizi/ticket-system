-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "emailMessageId" TEXT,
ADD COLUMN "fromEmail" TEXT,
ADD COLUMN "fromName" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEB';

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_emailMessageId_key" ON "Ticket"("emailMessageId");
