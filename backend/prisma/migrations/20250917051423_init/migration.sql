-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'leader', 'musician');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('planned', 'published', 'cancelled');

-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('draft', 'collecting', 'selecting', 'published', 'locked');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('pending', 'submitted', 'missed');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('invited', 'accepted', 'declined', 'withdrawn');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('email', 'sms');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "phoneE164" TEXT,
    "roles" "Role"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultStartTime" TEXT NOT NULL,
    "rrule" TEXT,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "leaderId" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'planned',

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorshipSet" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "SetStatus" NOT NULL DEFAULT 'draft',
    "suggestDueAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "WorshipSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "ccliNumber" TEXT,
    "defaultYoutubeUrl" TEXT,
    "tags" TEXT[],
    "language" TEXT,
    "familiarityScore" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongVersion" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "youtubeUrl" TEXT,
    "defaultKey" TEXT,
    "bpm" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SongVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetSong" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "songVersionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "keyOverride" TEXT,
    "youtubeUrlOverride" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "SetSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionSlot" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "minSongs" INTEGER NOT NULL,
    "maxSongs" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "SuggestionSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "youtubeUrlOverride" TEXT,
    "notes" TEXT,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "maxPerSet" INTEGER NOT NULL,

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefaultAssignment" (
    "id" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DefaultAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'invited',
    "invitedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE INDEX "Service_serviceDate_idx" ON "Service"("serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Service_serviceTypeId_serviceDate_key" ON "Service"("serviceTypeId", "serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorshipSet_serviceId_key" ON "WorshipSet"("serviceId");

-- CreateIndex
CREATE INDEX "Song_title_idx" ON "Song"("title");

-- CreateIndex
CREATE UNIQUE INDEX "SetSong_setId_position_key" ON "SetSong"("setId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Instrument_code_key" ON "Instrument"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DefaultAssignment_serviceTypeId_instrumentId_key" ON "DefaultAssignment"("serviceTypeId", "instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_setId_instrumentId_userId_key" ON "Assignment"("setId", "instrumentId", "userId");

-- CreateIndex
CREATE INDEX "Availability_userId_start_end_idx" ON "Availability"("userId", "start", "end");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipSet" ADD CONSTRAINT "WorshipSet_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongVersion" ADD CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetSong" ADD CONSTRAINT "SetSong_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetSong" ADD CONSTRAINT "SetSong_songVersionId_fkey" FOREIGN KEY ("songVersionId") REFERENCES "SongVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionSlot" ADD CONSTRAINT "SuggestionSlot_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionSlot" ADD CONSTRAINT "SuggestionSlot_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SuggestionSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultAssignment" ADD CONSTRAINT "DefaultAssignment_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultAssignment" ADD CONSTRAINT "DefaultAssignment_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultAssignment" ADD CONSTRAINT "DefaultAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WorshipSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
