-- CreateIndex
CREATE INDEX "conversations_participant1Id_lastMessageAt_idx" ON "conversations"("participant1Id", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_participant2Id_lastMessageAt_idx" ON "conversations"("participant2Id", "lastMessageAt");

-- CreateIndex
CREATE INDEX "listings_status_createdAt_idx" ON "listings"("status", "createdAt");

-- CreateIndex
CREATE INDEX "listings_status_price_idx" ON "listings"("status", "price");

-- CreateIndex
CREATE INDEX "listings_city_state_status_idx" ON "listings"("city", "state", "status");

-- CreateIndex
CREATE INDEX "listings_propertyType_status_idx" ON "listings"("propertyType", "status");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_readAt_idx" ON "messages"("conversationId", "createdAt", "readAt");

-- CreateIndex
CREATE INDEX "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_revieweeId_createdAt_idx" ON "reviews"("revieweeId", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_listingId_createdAt_idx" ON "reviews"("listingId", "createdAt");
