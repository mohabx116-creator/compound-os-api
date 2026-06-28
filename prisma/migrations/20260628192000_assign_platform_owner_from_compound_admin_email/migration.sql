UPDATE "residents" AS r
SET "is_platform_owner" = TRUE
FROM "compounds" AS c
WHERE r."compound_id" = c."id"
  AND r."role" = 'ADMIN'
  AND r."email" IS NOT NULL
  AND c."admin_email" IS NOT NULL
  AND LOWER(TRIM(r."email")) = LOWER(TRIM(c."admin_email"));
