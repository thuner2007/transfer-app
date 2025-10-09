-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "validUntil" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_email_key" ON "verification"("email");
