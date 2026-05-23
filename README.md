# Compound OS API Backend Foundation

This is the professional, production-oriented backend API foundation for **Compound OS**, a modern residential compound management system.

## Tech Stack
- **Node.js** & **Express.js** (modular monolith architecture)
- **TypeScript** (strict types, ES2022 output, NodeNext module resolution)
- **PostgreSQL** & **Prisma ORM** (Prisma-first schema)
- **Zod** (environment & payload validation)

---

## Architectural Guidelines
1. **Feature-based Modules**: Domain concerns are isolated under `src/modules/`.
2. **Thin Controllers**: Controllers handle only incoming request parsing/validation and format response JSON.
3. **Services Layer**: Business logic resides within domain service layers.
4. **Routes Isolation**: Routes only map HTTP endpoints and attach appropriate middlewares.
5. **No Direct Prisma Calls**: Database communication is strictly restricted to services.
6. **Strict Typing**: Strict TypeScript configurations to ensure complete type safety.

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
  ├── .env.example
  ├── .gitignore
  ├── package.json
  ├── tsconfig.json
  └── README.md
```

---

## Setup & Running Instructions

Follow these exact steps to set up and run the Compound OS API backend foundation locally:

### 1. Install Dependencies
Navigate into the `compound-os-api` directory and run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template `.env.example` file to `.env`:
```bash
copy .env.example .env
```
*(On Unix/macOS systems, use `cp .env.example .env`)*

Open the `.env` file and configure your `DATABASE_URL` with your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/compound_os?schema=public"
```

### 3. Validate database schema
Check the Prisma schema file for syntactical correctness:
```bash
npx prisma validate
```

### 4. Generate Prisma Client
Generate the type-safe Prisma client:
```bash
npm run prisma:generate
```

### 5. Run Database Migrations
Create and execute the initial schema migration against your PostgreSQL instance:
```bash
npm run prisma:migrate -- --name init
```

### 6. Start the Development Server
Launch the server in hot-reload mode:
```bash
npm run dev
```

---

## Testing the API

The health check endpoint is the only functional endpoint in this foundation.

### Test Health Endpoint
Send a `GET` request to:
`http://localhost:4000/api/v1/health`

#### Expected Success Response:
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "service": "compound-os-api",
    "environment": "development",
    "timestamp": "2026-05-23T13:00:00.000Z"
  }
}
```

---

## Current Scope Limits
To keep the initial foundation small, clean, and stable:
- **No authentication** or password hashing has been added (to be implemented later).
- **No CRUD endpoints** have been implemented yet.
- Modules for `compounds`, `units`, `residents`, and `complaints` export clean, empty route configurations.
