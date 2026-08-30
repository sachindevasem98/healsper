# Smart Healthcare Appointment Management System

TypeScript monorepo for a clinic outpatient workflow: secure role-based access, doctor schedules, appointments, check-in, queue management, consultations, prescriptions, follow-ups, notifications, and admin reporting.

## Quick start

1. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.
2. Install dependencies with `npm install`.
3. Generate and migrate the Prisma client:

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

The API runs on `http://localhost:4000` and the web app on `http://localhost:5173`.

The API is organized by domain under `apps/api/src/modules`; HTTP concerns are separated from business logic and persistence. The database schema is in `apps/api/prisma/schema.prisma`.
