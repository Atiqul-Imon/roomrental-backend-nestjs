# Apply Database Indexes Migration

## Issue
Prisma `migrate dev` requires a shadow database, which Supabase doesn't provide easily.

## Solution Options

### Option 1: Use Prisma db push (Development)
```bash
cd backend-nestjs
npx prisma db push
```
This will apply the schema changes directly without creating a migration. Good for development.

### Option 2: Apply Migration SQL Manually (Production)
```bash
cd backend-nestjs
npx prisma db execute --file prisma/migrations/20260120_add_composite_indexes/migration.sql --schema prisma/schema.prisma
```

### Option 3: Apply via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `prisma/migrations/20260120_add_composite_indexes/migration.sql`
4. Execute the SQL

### Option 4: Use Prisma Migrate Deploy (Production)
```bash
cd backend-nestjs
npx prisma migrate deploy
```
This applies pending migrations without requiring a shadow database.

## Migration SQL File
Location: `prisma/migrations/20260120_add_composite_indexes/migration.sql`

The migration creates 6 new composite indexes:
1. `listings_status_city_state_price_idx`
2. `listings_status_propertyType_petFriendly_idx`
3. `listings_landlordId_status_createdAt_idx`
4. `listings_availabilityDate_status_idx`
5. `listings_status_bedrooms_bathrooms_idx`
6. `listings_status_price_createdAt_idx`

## Verification
After applying, verify indexes were created:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'listings' 
AND indexname LIKE '%composite%' OR indexname LIKE '%status%';
```






