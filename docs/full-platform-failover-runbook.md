# Full Platform Failover Runbook

## 1. Current Architecture

- Primary API: Render `compound-os-api`
- Replica API: second Render account, service `compound-os-api-replica`
- Database: shared PostgreSQL for now
- Media: shared Cloudinary configuration
- Replica behavior: read/write app data through normal API flows, but do not run Prisma migrations automatically

## 2. Render Replica Settings

- Service type: Web Service
- Branch: `main`
- Root directory: repo root `.`
- Build command: `npm install && npm run build`
- Pre-deploy command: empty
- Start command: `npm run start`
- Health check: `GET /api/v1/health`
- Auto deploy: acceptable because the replica must not run migrations on boot
- CORS: origins only, no paths, no wildcard

## 3. Frontend Failover Map

- `sebahi-rental-web` -> `VITE_API_BASE_URL`
- `dalilsubhi-realestate-web` -> `VITE_API_BASE_URL`
- `compound-os-services-web` -> `VITE_API_BASE_URL`
- `compound-os-web` -> `VITE_API_BASE_URL`
- `compound-os-admin` -> `VITE_API_BASE_URL`
- `dalilsubhi-landing-web` -> link-only, no API switch currently

## 4. Redeploy Rule

- Vite env vars are build-time.
- After changing `VITE_API_BASE_URL` in Vercel, redeploy the affected frontend.

## 5. Data Protection

- Rentals: fallback snapshot plus export/import runbook already in place
- Real estate: fallback snapshot plus read-only backup/export runbook
- Services/community: services home uses cache/fallback; community is local/static
- Admin/resident: graceful failure only, no fake data

## 6. Emergency Checklist

1. Test primary API health.
2. Test replica API health.
3. If failover is needed, switch affected Vercel env vars to the replica API URL.
4. Redeploy affected frontends.
5. Test public pages and API-driven forms.
6. Keep Paymob callbacks on one host only until official cutover.

## 7. Do Not

- Run migrations from the replica automatically
- Point Paymob/webhooks to both hosts at once
- Commit backup JSON files or secrets
- Use `*` in production CORS
