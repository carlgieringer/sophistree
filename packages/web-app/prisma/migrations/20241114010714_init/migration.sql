-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authExternalId" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "argument_maps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceNameOverrides" JSONB NOT NULL DEFAULT '{}',
    "derivedFromId" TEXT,

    CONSTRAINT "argument_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "explicitVisibility" TEXT,
    "autoVisibility" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conclusions" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "propositionIds" TEXT[],
    "sourceNames" TEXT[],
    "urls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_authExternalId_key" ON "users"("authExternalId");

-- CreateIndex
CREATE INDEX "users_authExternalId_authProvider_idx" ON "users"("authExternalId", "authProvider");

-- AddForeignKey
ALTER TABLE "argument_maps" ADD CONSTRAINT "argument_maps_derivedFromId_fkey" FOREIGN KEY ("derivedFromId") REFERENCES "argument_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_maps" ADD CONSTRAINT "argument_maps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "argument_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclusions" ADD CONSTRAINT "conclusions_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "argument_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
