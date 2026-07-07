# Rentals Backup and Emergency Migration

## Layer 2: Read-Only Backup Export

### Source of Truth

- Database: PostgreSQL via Prisma.
- Primary rental tables:
  - `rental_listings`
  - `rental_listing_images`
  - `rental_beds`
  - `rental_owners`
  - `rental_inquiries`
  - `rental_reservations`
  - `rental_contact_unlocks`
  - `rental_owner_submissions`
  - `rental_tenants`
- Public images are stored as Cloudinary URLs in the database, not as local files.

### Export Method

Run the backup exporter from `compound-os-api`:

```bash
npm run export:rentals-backup
```

What it does:

- reads current public rental listings directly from Prisma
- fetches each public listing detail
- writes a dated JSON backup to `backups/rentals/rentals-backup-YYYY-MM-DD.json`
- updates `backups/rentals/rentals-backup-latest.json`
- performs no database mutation

### Backup Safety

- The exported rental snapshot is public-only data.
- It includes listing text, prices, availability, and image URLs.
- It does not include admin credentials or `.env` values.
- Operationally, it should stay external and ignored by git because it is regenerated often.
- If a one-off review copy is needed, the JSON is safe to commit because it is public data only.

### Refresh Process for the Frontend Fallback

1. Export the backup JSON from `compound-os-api`.
2. Refresh the frontend fallback module:

```bash
npm run sync:rentals-fallback -- --input ../compound-os-api/backups/rentals/rentals-backup-latest.json
```

3. Re-run validation in `sebahi-rental-web`:

```bash
npm run type-check
npm run build
```

### API-Down Test

- Point `VITE_API_BASE_URL` in `sebahi-rental-web` to an invalid host.
- Confirm the rentals list still renders from `src/data/rentals-fallback.ts`.
- Confirm detail and contact pages still open from fallback data.
- Confirm images keep layout even if remote image fetches fail.

## Layer 3: Emergency Migration Readiness

### Backend Framework

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL

### Build and Start Commands

- Build: `npm run build`
- Start: `npm run start`
- Dev: `npm run dev`
- Type check: `npm run type-check`

### Required Environment Names

Boot/runtime:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `DIRECT_URL`
- `CORS_ORIGINS`
- `PASSWORD_SALT_ROUNDS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

Rentals and media:

- `PUBLIC_RENTAL_BASE_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER`
- `CLOUDINARY_OWNER_SUBMISSIONS_FOLDER`
- `CLOUDINARY_LISTINGS_FOLDER`

Payments:

- `PAYMOB_API_KEY`
- `PAYMOB_INTEGRATION_ID_CARD`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_CALLBACK_URL`
- `PAYMOB_WEBHOOK_SECRET`

### Storage and External Services

- Database: PostgreSQL
- Image storage: Cloudinary
- Payments: Paymob
- Health check: `GET /api/v1/health`

### CORS / Frontend Cutover

- Frontend currently uses `VITE_API_BASE_URL`.
- Default value in `sebahi-rental-web` points to Render.
- For migration, update `VITE_API_BASE_URL` to the new API host.

### Recommended Emergency Host

- Fastest practical migration path: Railway.
- Reason:
  - works with Node/TypeScript/Prisma without needing a Dockerfile first
  - supports environment variables and managed PostgreSQL
  - minimal change from current build/start model
- Secondary options:
  - Fly.io, if a Dockerfile is added
  - Cloud Run, if containerization is added
  - VPS, if manual ops are acceptable

### Migration Checklist

1. Provision the new host and PostgreSQL database.
2. Copy runtime env vars, including `DATABASE_URL` and `DIRECT_URL`.
3. Set `CORS_ORIGINS` to the frontend domains.
4. Deploy the backend with:
   - build command: `npm run build`
   - start command: `npm run start`
5. Run Prisma migrations with:
   - `npm run prisma:deploy`
6. Verify:
   - `GET /api/v1/health`
   - `GET /api/v1/rentals/listings`
   - `GET /api/v1/rentals/listings/:slug`
7. Update `sebahi-rental-web`:
   - set `VITE_API_BASE_URL` to the new API host
8. Re-test:
   - list page
   - detail page
   - contact page
   - image loading
   - mobile layout
9. Keep old Render service available until the new host is proven stable.

### Full Platform Runbook

- For the broader platform failover plan, see `docs/full-platform-failover-runbook.md`.
