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
