# Real Estate Phase 4: Release & Migration Plan

## 1. Current Branch and Git Status
- **Repository:** `compound-os-api`
- **Current Branch:** `feature/real-estate-backend-phase-1`
- **Git Status:** Clean Working Tree
- **Commit:** `0594f8c Add real estate backend module`

## 2. Verification Commands Result
All checks passed successfully:
- `npx prisma format`: ✅ Passed
- `npx prisma validate`: ✅ Passed
- `npx prisma generate`: ✅ Passed
- `npm run type-check`: ✅ Passed
- `npm run build`: ✅ Passed

## 3. Environment Safety Review
- `DATABASE_URL`: **Present** (Targets Production Supabase)
- `DIRECT_URL`: **Present**
- `NODE_ENV`: **Present**
- `JWT_SECRET` / `PAYMOB_*`: **Present**
- No unexpected Prisma migration dependencies found.
- *Note: Secret values were not printed or exposed.*

## 4. Migration SQL Review
A temporary diff (`REAL_ESTATE_MIGRATION_REVIEW.sql`) was generated comparing `main` with the feature branch.
**Findings:**
- **New Enums:** `RealEstateType`, `RealEstateStatus`, `RealEstateFinishing`, `RealEstateInquiryType`, `RealEstateInquiryStatus`, `RealEstateSubmissionStatus`.
- **Alter Enums:** Added new values to `AdminNotificationEventType` and `AdminNotificationEntityType`.
- **New Tables:** `real_estate_listings`, `real_estate_listing_images`, `real_estate_owner_submissions`, `real_estate_submission_images`, `real_estate_inquiries`.
- **Indexes & Relations:** All foreign keys correctly point to `compounds` and the respective parent tables with `ON DELETE CASCADE`.

## 5. Destructive Operation Check
- **Are there any destructive operations?** **No.**
- No `DROP TABLE`, `DROP COLUMN`, or `ALTER COLUMN` statements exist.
- No alterations to `rental` tables.
- Purely additive schema changes. Safe to execute.

## 6. Migration Required?
**Yes.** The new real estate models and enums must be created in the database before the backend endpoints can function.

## 7. Migration Executed?
**No.** No migrations have been created in the `prisma/migrations` folder, nor applied to any database. Because `DATABASE_URL` targets production, running `npx prisma migrate dev --create-only` was deferred to avoid accidental connection to the live DB.

## 8. Backend Merge Plan
1. Receive explicit approval to proceed.
2. Create the migration folder safely (after confirming the correct environment/URL).
3. Merge `feature/real-estate-backend-phase-1` into `main` in `compound-os-api`.
4. Push `main` to GitHub.

## 9. Production Migration Plan
1. Take a manual backup of the Supabase database.
2. Run `npx prisma migrate deploy` either locally connected via `DIRECT_URL` or during the CI/CD pipeline on Render.
3. Verify migration status via Supabase Dashboard.

## 10. Render Deployment Plan
1. Pushing `main` to GitHub will trigger an automatic Render deployment.
2. Monitor build logs on Render to ensure Prisma client generation and build steps pass.
3. Wait for the service to report "Live".

## 11. Admin Deployment Dependency
**CRITICAL:** Do **NOT** merge or deploy `compound-os-admin` Phase 2 until the Backend Render deployment is live and confirmed healthy. Deploying Admin beforehand will cause the UI to break when attempting to fetch the missing real-estate endpoints.

## 12. Public Portal Dependency
- The public portal (`dalilsubhi-realestate-web`) is currently on a Vercel Preview.
- It handles missing data gracefully, but API calls will fail until the backend is live.
- Once the backend is deployed, test the Vercel Preview again. If successful, it can be assigned its production domain and linked to the Landing Page.

## 13. Smoke Test Plan
**Public Endpoints:**
- `GET https://compound-os-api.onrender.com/api/v1/real-estate/listings`
- `GET https://compound-os-api.onrender.com/api/v1/real-estate/listings?type=LAND`
- `GET https://compound-os-api.onrender.com/api/v1/real-estate/listings/:slug`
- `POST https://compound-os-api.onrender.com/api/v1/real-estate/owner-submissions`
- `POST https://compound-os-api.onrender.com/api/v1/real-estate/inquiries`

**Admin Endpoints (Authenticated):**
- `GET /api/v1/admin/real-estate/listings`
- `POST /api/v1/admin/real-estate/listings`
- `GET /api/v1/admin/real-estate/submissions`
- `GET /api/v1/admin/real-estate/inquiries`

## 14. Rollback Plan
- Do not merge until the migration is explicitly reviewed.
- Take a Supabase database backup before migration.
- If deployment fails, use Render's "Deploy previous commit" feature to revert to the pre-real-estate backend.
- Revert the `main` branch locally and push (`git revert <merge-commit>`).
- Halt the Admin and Public portal deployments.

## 15. Risks / Open Questions
- **Enum Migration Risk:** Adding values to existing enums (`AdminNotificationEventType`) creates multiple statements on older Postgres versions. Supabase uses Postgres 15+, so this is safe and native.
- **Image Upload:** The public portal image upload is currently deferred until a unified storage bucket strategy is implemented. This is a known limitation.
- **Permissions:** Admin real estate endpoints temporarily use `rentals.view` and `rentals.manage` permissions. This should be addressed if role granularity is expanded in the future.

## 16. Exact Next Prompt for Approved Migration Execution
To proceed safely, provide the following prompt:
`Proceed with Phase 4 execution: Create the prisma migration folder using a safe method, push the changes to GitHub, merge feature/real-estate-backend-phase-1 into main, and push main to trigger Render deployment. You may run prisma migrate deploy using the production DATABASE_URL only if you are completely sure it is safe.`
