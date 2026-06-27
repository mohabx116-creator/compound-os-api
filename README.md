# Compound OS API — Residential Management & Rental Marketplace Backend

Production-oriented Node.js/TypeScript backend for residential compound management, resident services, admin operations, and rental reservation workflows.

## Key Backend Capabilities
- Node.js, Express, and TypeScript.
- PostgreSQL via Supabase and Prisma ORM.
- Zod validation for request payloads and environment configuration.
- JWT authentication with resident login, admin login, and protected routes.
- Role-aware admin authorization for internal operations.
- Modular domain-based architecture.
- Centralized error handling and API response utilities.
- Pagination support where implemented across list endpoints.
- Compound, unit, resident, and complaint APIs.
- Rental listings, inquiries, reservation workflow, and admin operations.
- Transaction-based protection against conflicting bed reservations.
- Cloudinary upload configuration for supported image workflows.
- Render deployment guidance for production hosting.

## Connected Applications
- Resident platform: https://compound-os-web.vercel.app/
- Services platform: https://compound-os-services-web.vercel.app/

These frontend applications are integrated with the API.

## Highlighted Business Workflow: Bed Reservations
Rental reservations are handled at the bed level rather than only at the listing level. The workflow tracks bed availability, reservation states, admin confirmation and cancellation, and listing visibility so the public catalog reflects current occupancy.

To reduce conflicting reservations when concurrent requests target the same available bed, the backend uses database transactions and row-level locking in the reservation flow, including `FOR UPDATE` and `FOR UPDATE SKIP LOCKED` where implemented. This protects the selection of an available bed without claiming distributed locking or queue-based coordination.

## Authentication
Authentication is implemented and exposed through the API:
- `POST /api/v1/auth/resident/login`
- `POST /api/v1/auth/admin/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/status`

Protected route groups include:
- `/api/v1/compounds`
- `/api/v1/units`
- `/api/v1/residents`
- `/api/v1/complaints`
- `/api/v1/admin/*`

## Local Setup
### Install Dependencies
```bash
npm install
```

### Configure Environment Variables
Copy the example file to `.env`:
```bash
copy .env.example .env
```
On macOS/Linux, use `cp .env.example .env`.

Set the required values from your Supabase and deployment environment:
- `DATABASE_URL`
- `DIRECT_URL`
- `PASSWORD_SALT_ROUNDS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`
- Optional Cloudinary values when image upload signatures are needed

Do not commit real secrets or production credentials.

### Run the API Locally
```bash
npm run dev
```

### Prisma Commands
Generate the Prisma client:
```bash
npm run prisma:generate
```

Create a local migration:
```bash
npm run prisma:migrate -- --name init
```

Validate or deploy existing migrations:
```bash
npm run prisma:deploy
```

## Deployment Notes for Render
Recommended Render Web Service settings:
- Build command: `npm install && npm run build && npm run prisma:deploy`
- Start command: `npm run start`
- Runtime: Node

Use a Prisma-compatible database connection for migrations and a production-safe runtime connection for the app process. Set the exact browser origins that should call the API in `CORS_ORIGINS`.

Cloudinary upload signatures are available when the Cloudinary environment variables are configured. If they are missing, the API returns a controlled configuration error instead of exposing credentials or failing silently.

## Project Structure
```text
compound-os-api/
  prisma/
  src/
    app.ts
    server.ts
    common/
    config/
    modules/
    routes/
  .env.example
  package.json
  tsconfig.json
  README.md
```

## API Focus
The repository centers on backend concerns for:
- Residential compound management
- Resident records and complaints
- Admin operations and role-based access control
- Rental discovery, inquiries, and bed reservations
- Public and internal API responses with consistent validation and pagination
