-- Verification Query: Check if all new indexes were created
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'listings' 
  AND (
    indexname LIKE '%status_city_state_price%' OR
    indexname LIKE '%status_propertyType_petFriendly%' OR
    indexname LIKE '%landlordId_status_createdAt%' OR
    indexname LIKE '%availabilityDate_status%' OR
    indexname LIKE '%status_bedrooms_bathrooms%' OR
    indexname LIKE '%status_price_createdAt%'
  )
ORDER BY indexname;






