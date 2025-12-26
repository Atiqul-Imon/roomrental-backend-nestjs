-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('apartment', 'house', 'dorm', 'studio', 'shared_room', 'private_room');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('male', 'female', 'coed', 'any');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "genderPreference" "GenderPreference" DEFAULT 'any',
ADD COLUMN     "nearbyTransit" TEXT[],
ADD COLUMN     "nearbyUniversities" TEXT[],
ADD COLUMN     "parkingAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "petFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "propertyType" "PropertyType",
ADD COLUMN     "smokingAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walkabilityScore" INTEGER;

-- CreateIndex
CREATE INDEX "listings_bedrooms_idx" ON "listings"("bedrooms");

-- CreateIndex
CREATE INDEX "listings_bathrooms_idx" ON "listings"("bathrooms");

-- CreateIndex
CREATE INDEX "listings_squareFeet_idx" ON "listings"("squareFeet");

-- CreateIndex
CREATE INDEX "listings_propertyType_idx" ON "listings"("propertyType");

-- CreateIndex
CREATE INDEX "listings_petFriendly_idx" ON "listings"("petFriendly");

-- CreateIndex
CREATE INDEX "listings_latitude_longitude_idx" ON "listings"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "listings_viewCount_idx" ON "listings"("viewCount");
