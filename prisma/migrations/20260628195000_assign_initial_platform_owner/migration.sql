DO $$
DECLARE
  target_count integer;
BEGIN
  SELECT COUNT(*)
    INTO target_count
  FROM "residents"
  WHERE "role" = 'ADMIN'
    AND LOWER(TRIM("email")) = LOWER(TRIM('mohabx116@gmail.com'));

  IF target_count = 0 THEN
    RAISE EXCEPTION 'Platform owner bootstrap failed: ADMIN resident with email % was not found', 'mohabx116@gmail.com';
  END IF;

  UPDATE "residents"
  SET "is_platform_owner" = FALSE;

  UPDATE "residents"
  SET "is_platform_owner" = TRUE
  WHERE "role" = 'ADMIN'
    AND LOWER(TRIM("email")) = LOWER(TRIM('mohabx116@gmail.com'));

  IF (SELECT COUNT(*) FROM "residents" WHERE "is_platform_owner" = TRUE) <> 1 THEN
    RAISE EXCEPTION 'Platform owner bootstrap failed: expected exactly one platform owner';
  END IF;
END
$$;

CREATE UNIQUE INDEX "residents_single_platform_owner_key"
  ON "residents" ("is_platform_owner")
  WHERE "is_platform_owner" = true;
