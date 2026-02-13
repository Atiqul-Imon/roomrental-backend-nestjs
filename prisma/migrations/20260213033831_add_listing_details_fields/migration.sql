-- AlterTable
ALTER TABLE "listings" ADD COLUMN "billsIncluded" BOOLEAN DEFAULT false,
ADD COLUMN "securityDeposit" DOUBLE PRECISION,
ADD COLUMN "roomFurnishing" TEXT,
ADD COLUMN "minStayMonths" INTEGER,
ADD COLUMN "maxStayMonths" INTEGER,
ADD COLUMN "currentRoomiesCount" INTEGER DEFAULT 0;


