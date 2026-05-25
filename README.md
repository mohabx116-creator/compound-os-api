# Compound OS API Backend Foundation

This is the professional, production-oriented backend API foundation for **Compound OS**, a modern residential compound management system.

---

## Deployment & Hosting Strategy
To ensure maximum scalability, performance, and modern continuous integration:
- **Backend Service**: Hosted on **Render** (Web Service).
- **Database Layer**: Hosted on **Supabase** (Serverless PostgreSQL Database).
- **Frontend Layer (Later)**: Hosted on **Vercel** (Static/Serverless SPA or Next.js app).

---

## Tech Stack
- **Node.js** & **Express.js** (modular monolith architecture)
- **TypeScript** (strict types, ES2022 output, NodeNext module resolution)
- **Supabase PostgreSQL** & **Prisma ORM** (Prisma-first schema)
- **Zod** (environment & payload validation)
- **bcrypt** (password hashing utilities prepared for the auth phase)

---

## Folder Structure

```
compound-os-api/
  ├── prisma/
  │   └── schema.prisma         # Single source of truth database schema
  ├── src/
  │   ├── app.ts                # Express application configuration
  │   ├── server.ts             # HTTP Server entrypoint & graceful shutdowns
  │   ├── config/
  │   │   ├── env.ts            # Environment variables parsing and Zod validation
  │   │   └── prisma.ts         # Prisma Client development/production singleton
  │   ├── common/
  │   │   ├── errors/           # Custom AppError structures and error-codes
  │   │   ├── middlewares/      # Error, Route-Not-Found, and Zod validator middlewares
  │   │   ├── utils/            # Async handler wrapper, API responses, and pagination helpers
  │   │   └── types/            # Global Express Request expansions
  │   ├── modules/              # Domain-specific modules (compounds, units, residents, complaints)
  │   └── routes/               # Modular Express API root routes
  ├── .env
  ├── .env.example
  ├── .gitignore
  ├── package.json
  ├── tsconfig.json
  └── README.md
```

---

## Local Setup & Development Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template `.env.example` file to `.env`:
```bash
copy .env.example .env
```
*(On Unix/macOS systems, use `cp .env.example .env`)*

Open the `.env` file and configure your `DATABASE_URL` using the connection strings copied from your **Supabase Dashboard > Connect** panel.

Auth phases define these variables:

```bash
PASSWORD_SALT_ROUNDS=12
JWT_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
JWT_EXPIRES_IN="7d"
```

`JWT_SECRET` must be a long random secret before login/JWT issuing can succeed. Do not use the placeholder value in production.

---

## Supabase Connection Guidelines
To avoid common connection limits or pooler conflicts, copy the exact Prisma-compatible connection strings directly from your **Supabase Dashboard > Connect** panel and apply these rules:

### 1. Local Migrations (`prisma migrate dev`)
* Use a direct database connection or a **Supavisor Session Mode** connection string that fully supports DDL migration operations.
* **Network compatibility**: Supabase direct database connections may require IPv6 support depending on your project and network. If direct connection fails, use **Supavisor Session Mode** or the migration-compatible connection option recommended in your Supabase Dashboard.

### 2. Production Deployments (`prisma migrate deploy` on Render)
* Set a connection string during the automated build pipeline that supports running Prisma DDL migrations.

### 3. Serverless Runtime (`npm run start` / `npm run dev`)
* Set your runtime database url to the Prisma/server runtime connection string recommended in the Supabase Connect panel (which leverages connection poolers to prevent exhaustion of connection slots).

---

## First Database Migration (Supabase)
To establish database schemas on Supabase:
1. Temporarily set your `.env` file's `DATABASE_URL` to your migration-compatible connection string.
2. Run the Prisma migration CLI:
   ```bash
   npm run prisma:migrate -- --name init
   ```
3. Once the migration has completed, revert your `.env` `DATABASE_URL` to the pooler/server runtime connection string.

### Start the Development Server
Launch the local server with hot-reloads enabled:
```bash
npm run dev
```

---

## Render Deployment Instructions

When deploying the **Compound OS API** backend to Render as a Web Service:

### 1. Connect Github Repository
Log into Render and create a new **Web Service**, connecting the Github repository where the project resides.

### 2. Configure Build & Start Commands
Under the **Settings** panel, configure the build and run pipelines:
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build && npm run prisma:deploy`
- **Start Command**: `npm run start`

*(The build command will download packages, generate Prisma typings, build TypeScript files into `dist/`, and run `prisma migrate deploy` to safely apply pending database migrations automatically).*

### 3. Setup Environment Variables
Under the **Environment** tab, add the following variables:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render allocates ports automatically, but setting this aligns validations)
- `DATABASE_URL`: Set this to the Supabase connection string recommended for **Prisma/server runtime** from the Supabase Connect panel.

---

## Testing the API

The health check endpoint is the only functional endpoint in this foundation.

## Auth Foundation Status

Phase A2 adds backend login and JWT issuing while leaving existing CRUD routes unprotected until Phase A3.

Current auth status:
- Resident login is available at `POST /api/v1/auth/resident/login`.
- Admin login is available at `POST /api/v1/auth/admin/login`.
- Authenticated user lookup is available at `GET /api/v1/auth/me`.
- Existing CRUD routes are still not protected yet.
- Frontend apps still use their current mock sessions.

Auth module readiness can be checked with:

```http
GET /api/v1/auth/status
```

Expected response:

```json
{
  "success": true,
  "message": "Auth module is ready",
  "data": {
    "authEnabled": true,
    "phase": "login-jwt",
    "residentLogin": true,
    "adminLogin": true
  }
}
```

### Resident Login

Residents type only phone and password in the UI. The resident app should send `compoundCode` internally after the user selects a compound logo/button.

```http
POST /api/v1/auth/resident/login
Content-Type: application/json

{
  "compoundCode": "black-horse",
  "phone": "+201222222222",
  "password": "resident-password"
}
```

Successful login returns a safe user object, an access token, and the token expiry. Password hashes are never returned.

### Admin Login

Admin login uses email and password in Phase A2:

```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin-password"
}
```

Only `ADMIN`, `MANAGER`, `ACCOUNTANT`, `SECURITY`, and `MAINTENANCE` roles can use admin login. `RESIDENT` users cannot pass admin login.

### Authenticated User

```http
GET /api/v1/auth/me
Authorization: Bearer ACCESS_TOKEN
```

### Test Password Setup

Current live residents may not have `password_hash` populated yet. A2 does not seed users or mutate live passwords automatically.

For a controlled manual test, generate a bcrypt hash using the backend password utility or a one-off local Node/Prisma script, then intentionally update one known test resident's `password_hash`. Do not commit real passwords or hashes, and do not log secrets. Also make sure the selected compound has a tenant `code`, such as `black-horse`.

### Test Health Endpoint
Send a `GET` request to:
`http://localhost:4000/api/v1/health` (or your Render Web Service URL)

#### Expected Success Response:
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "service": "compound-os-api",
    "environment": "development",
    "timestamp": "ISO_TIMESTAMP"
  }
}
```

---

## Compounds API

Base path: `/api/v1/compounds`

### Tenant Code Foundation

Phase A1B adds an optional compound `code` field as a technical tenant slug.

Rules:
- `code` is optional in A1B so existing live compounds are not forced to change immediately.
- `code` must be slug-safe when provided: lowercase letters, numbers, and hyphens only.
- Examples: `black-horse`, `compound-os-demo`.
- `code` is unique across compounds.
- Resident phone numbers remain unique per compound, not globally unique.

Future resident login UX:
- The resident will select/tap a compound logo or compound button in the app.
- The frontend will send the selected compound's `compoundCode` internally.
- The resident will only type phone and password.
- Future login payload shape will use hidden tenant context:

```json
{
  "compoundCode": "black-horse",
  "phone": "+201222222222",
  "password": "..."
}
```

A1B does not implement login, JWT issuing, protected routes, or frontend integration. Production should restrict changing `code` after real users depend on it.

### List Compounds
```http
GET /api/v1/compounds?page=1&limit=10&search=demo&isActive=true
```

Returns a paginated list of active compounds by default. Pass `isActive=false` to list inactive compounds.

### Get Compound
```http
GET /api/v1/compounds/{id}
```

Returns one compound by UUID with related counts for units, residents, and complaints, or `404` when it does not exist.

### Create Compound
```http
POST /api/v1/compounds
Content-Type: application/json

{
  "name": "Demo Compound",
  "code": "compound-os-demo",
  "adminEmail": "admin@example.com",
  "address": "Cairo",
  "phone": "01000000000"
}
```

### Update Compound
```http
PATCH /api/v1/compounds/{id}
Content-Type: application/json

{
  "name": "Updated Compound"
}
```

### Delete Compound
```http
DELETE /api/v1/compounds/{id}
```

The delete endpoint safely deactivates a compound using `isActive=false`. It returns `409` if the compound has related units, residents, or complaints. Repeating delete for an already inactive compound returns `200` with a clear "already inactive" message.

---

## Units API

Base path: `/api/v1/units`

### List Units
```http
GET /api/v1/units?page=1&limit=10&search=A&compoundId={compoundId}&status=VACANT&unitType=APARTMENT
```

Returns a paginated list of units with basic compound information.

### Get Unit
```http
GET /api/v1/units/{id}
```

Returns one unit by UUID with basic compound information and related counts for residents and complaints.

### Create Unit
```http
POST /api/v1/units
Content-Type: application/json

{
  "compoundId": "ca155709-2f8c-47ab-8e91-6fa0504cf435",
  "unitNumber": "A-101",
  "unitType": "APARTMENT",
  "floor": 1,
  "areaSqm": 120.5,
  "status": "VACANT"
}
```

Returns `404` if the compound does not exist and `409` if the unit number already exists in the same compound.

### Update Unit
```http
PATCH /api/v1/units/{id}
Content-Type: application/json

{
  "status": "MAINTENANCE"
}
```

### Delete Unit
```http
DELETE /api/v1/units/{id}
```

Deletes a unit only when it has no related residents or complaints. Returns `409` if deleting the unit would remove linked business data.

---

## Residents API

Base path: `/api/v1/residents`

### List Residents
```http
GET /api/v1/residents?page=1&limit=10&search=Ahmed&compoundId={compoundId}&unitId={unitId}&status=ACTIVE&role=RESIDENT
```

Returns a paginated list of residents with basic compound and unit information. Password hashes are never returned.

### Get Resident
```http
GET /api/v1/residents/{id}
```

Returns one resident by UUID with basic compound and unit information plus a complaints count.

### Create Resident
```http
POST /api/v1/residents
Content-Type: application/json

{
  "compoundId": "ca155709-2f8c-47ab-8e91-6fa0504cf435",
  "unitId": "f863d57c-e951-4a4d-bced-ce2bc2647d13",
  "fullName": "Ahmed Test Resident",
  "phone": "+201222222222",
  "email": "resident.test@compoundos.com",
  "role": "RESIDENT",
  "status": "ACTIVE"
}
```

Returns `404` if the compound or unit does not exist, `409` if the unit belongs to another compound, and `409` if the phone already exists in the same compound.

### Update Resident
```http
PATCH /api/v1/residents/{id}
Content-Type: application/json

{
  "status": "INACTIVE"
}
```

Use `"unitId": null` to unlink a resident from a unit and `"email": null` to clear an email.

### Delete Resident
```http
DELETE /api/v1/residents/{id}
```

Deletes a resident only when there are no related complaints. Returns `409` if deleting the resident would remove complaint history.

---

## Complaints API

Base path: `/api/v1/complaints`

### List Complaints
```http
GET /api/v1/complaints?page=1&limit=10&search=leakage&compoundId={compoundId}&residentId={residentId}&unitId={unitId}&status=OPEN&priority=HIGH
```

Returns a paginated list of complaints with basic compound, resident, and unit information.

### Get Complaint
```http
GET /api/v1/complaints/{id}
```

Returns one complaint by UUID with basic compound, resident, and unit information.

### Create Complaint
```http
POST /api/v1/complaints
Content-Type: application/json

{
  "compoundId": "ca155709-2f8c-47ab-8e91-6fa0504cf435",
  "residentId": "1b0e1f72-2d0c-4a2d-bd47-1a125bfe5a6c",
  "unitId": "f863d57c-e951-4a4d-bced-ce2bc2647d13",
  "title": "Water leakage in bathroom",
  "description": "There is a water leakage issue that needs maintenance follow-up.",
  "priority": "HIGH",
  "status": "OPEN"
}
```

Returns `404` if the compound, resident, or unit does not exist, and `409` if the resident or unit belongs to another compound.

### Update Complaint
```http
PATCH /api/v1/complaints/{id}
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

Use `"unitId": null` to unlink a complaint from a unit.

### Close Complaint
```http
DELETE /api/v1/complaints/{id}
```

Closes the complaint using `status=CLOSED` instead of hard deleting historical complaint data. Repeating delete for an already closed complaint returns `200` with a clear message.
