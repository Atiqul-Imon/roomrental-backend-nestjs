-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_city_state_price_idx" ON "listings"("status", "city", "state", "price");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_propertyType_petFriendly_idx" ON "listings"("status", "propertyType", "petFriendly");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_landlordId_status_createdAt_idx" ON "listings"("landlordId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_availabilityDate_status_idx" ON "listings"("availabilityDate", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_bedrooms_bathrooms_idx" ON "listings"("status", "bedrooms", "bathrooms");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_price_createdAt_idx" ON "listings"("status", "price", "createdAt");






