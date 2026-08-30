# Implementation Plan — Smart Healthcare Appointment & Patient Queue Management System

## Overview

This document outlines the phased implementation plan for the WhosNext healthcare platform.
The project has a solid backend foundation (10 modules, 35+ endpoints, 15 DB models) and an
early-stage frontend prototype (single-file React app). This plan covers backend security
fixes, missing endpoints, frontend infrastructure, and all user-facing features across 7 phases.

---

## Current State Summary

### What's Done
- **Backend**: 10 API modules (auth, doctors, appointments, queue, consultations, departments, clinics, schedules, leaves, patients)
- **Database**: 15 Prisma models, 3 enums, indexes, unique constraints
- **Security basics**: Argon2 hashing, JWT auth, RBAC middleware, Helmet, CORS, rate limiting, Zod validation
- **Transaction-safe booking** with double-booking prevention
- **Queue system** with token-based sequencing
- **Consultation + prescription** creation in transactions
- **Schedule/leave management** with overlap detection

### Critical Issues Found
1. Anyone can register as ADMIN — `POST /auth/register` accepts `role` from request body
2. `PATCH /appointments/:id/status` has zero RBAC — any user can change any appointment status
3. Queue operations lack ownership checks — any doctor can operate on any other doctor's queue
4. Frontend sends no auth tokens — appointments API call will always 401
5. No appointment cancellation/reschedule endpoints
6. No pagination on any list endpoint
7. No refresh tokens — 1-hour JWT expiry with no refresh mechanism

### What's Missing
- Notification model exists but has zero endpoints
- AuditLog model exists but nothing writes to it
- FollowUp model exists but no create endpoint
- No admin listing/search for patients
- No doctor account management by admin
- No password reset / forgot password
- No logout / token invalidation
- No appointment state machine
- Frontend: no routing, no auth, no forms, no interactivity

---

## Tech Decisions

| Decision | Choice |
|----------|--------|
| CSS Framework | Tailwind CSS (replacing custom vanilla CSS) |
| State Management | Local state with props drilling (no library) |
| Routing | react-router-dom |
| Auth Persistence | localStorage (token + refreshToken) |

---

## Phase 1: Backend Security & Foundation Fixes

**Goal**: Lock down the API before building any UI on top of it.

### 1.1 Fix Registration — Restrict Role to PATIENT

**File**: `apps/api/src/modules/auth/routes.ts`

- Remove `role` from the Zod input schema
- Hardcode role to `Role.PATIENT` in the handler
- Doctor and admin accounts created through admin-only endpoints (Phase 2)

### 1.2 Fix Appointment Status RBAC

**File**: `apps/api/src/modules/appointments/routes.ts`

- Patient: can only cancel their own appointments (status → CANCELLED only)
- Doctor: can update status of their own patients' appointments
- Admin: can update any appointment status
- Add ownership verification in the handler

### 1.3 Add Appointment State Machine

**File**: `apps/api/src/modules/appointments/routes.ts`

Enforce valid status transitions:
```
PENDING       → [CONFIRMED, CANCELLED]
CONFIRMED     → [CHECKED_IN, CANCELLED, NO_SHOW]
CHECKED_IN    → [WAITING, CANCELLED]
WAITING       → [IN_CONSULTATION, CANCELLED]
IN_CONSULTATION → [COMPLETED]
COMPLETED     → [] (terminal)
CANCELLED     → [] (terminal)
RESCHEDULED   → [] (terminal)
NO_SHOW       → [] (terminal)
```

### 1.4 Add Appointment Cancellation Endpoint

**File**: `apps/api/src/modules/appointments/routes.ts`

- `POST /appointments/:id/cancel`
- Auth: `requireAuth`, RBAC: Patient (own), Doctor (their patients), Admin (all)
- Validates current status is cancellable (PENDING or CONFIRMED)

### 1.5 Add Appointment Reschedule Endpoint

**File**: `apps/api/src/modules/appointments/routes.ts`

- `POST /appointments/:id/reschedule`
- Auth: `requireAuth`, RBAC: Patient (own), Admin (all)
- Input: `{ startsAt: Date }`
- Uses transaction: update existing + check conflict
- Current appointment → RESCHEDULED, new appointment created CONFIRMED

### 1.6 Fix Queue Ownership

**File**: `apps/api/src/modules/queue/routes.ts`

- In `call`, `skip`, `serve`: verify `doctor.userId === req.user.id` for DOCTOR role
- ADMIN bypasses ownership check

### 1.7 Add Logout Endpoint

**File**: `apps/api/src/modules/auth/routes.ts`

- `POST /auth/logout` — client-side token removal (clear localStorage)
- No server-side blacklist needed at this scale (1-hour JWT expiry)

### 1.8 Add Refresh Token Mechanism

**Files**: `apps/api/src/lib/auth.ts`, `apps/api/src/modules/auth/routes.ts`

- `POST /auth/refresh` — verify refresh token, issue new access token
- Refresh token expiry: 7 days
- Update login/register responses to include `refreshToken`

### 1.9 Add Password Change Endpoint

**File**: `apps/api/src/modules/auth/routes.ts`

- `PATCH /auth/password`
- Auth: `requireAuth`
- Input: `{ currentPassword, newPassword }` (Zod validated, min 8 chars)

### 1.10 Add Pagination to List Endpoints

**Files**: All `routes.ts` files with list endpoints

Pattern: `?page=1&limit=20` query params (offset-based)

Apply to:
- `GET /doctors` — `apps/api/src/modules/doctors/routes.ts`
- `GET /appointments/mine` — `apps/api/src/modules/appointments/routes.ts`
- `GET /queue/today/:doctorId` — `apps/api/src/modules/queue/routes.ts`
- `GET /departments` — `apps/api/src/modules/departments/routes.ts`
- `GET /clinics` — `apps/api/src/modules/clinics/routes.ts`
- `GET /patients/mine/consultations` — `apps/api/src/modules/patients/routes.ts`
- `GET /patients/mine/prescriptions` — `apps/api/src/modules/patients/routes.ts`
- `GET /consultations/patient/:patientId` — `apps/api/src/modules/consultations/routes.ts`

Response format:
```json
{
  "success": true,
  "data": [...items],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 1.11 Add Input Sanitization

**File**: `apps/api/src/middleware/sanitize.ts` (new)

- Middleware that strips HTML tags from all string body fields
- Apply globally in `server.ts`

---

## Phase 2: Missing Backend Endpoints

**Goal**: Complete the API so the frontend has everything it needs.

### 2.1 Notification Endpoints

**File**: `apps/api/src/modules/notifications/routes.ts` (new)

- `GET /notifications/mine` — list user's notifications (paginated, `?unread=true` filter)
- `PATCH /notifications/:id/read` — mark as read
- `POST /notifications/read-all` — mark all as read
- `DELETE /notifications/:id` — delete a notification

**Helper**: `apps/api/src/lib/notify.ts` (new) — reusable `createNotification(userId, title, message)`

### 2.2 Audit Logging Middleware

**File**: `apps/api/src/middleware/audit.ts` (new)

- Logs write operations (POST, PATCH, DELETE) to AuditLog table
- Captures: userId, action, entity, entityId, metadata
- Apply in `server.ts` after auth middleware

### 2.3 Follow-Up Creation

**File**: `apps/api/src/modules/consultations/routes.ts`

- `POST /consultations/:id/follow-up`
- Auth: `requireAuth`, `requireRole(Role.DOCTOR)`
- Input: `{ scheduledFor: Date, reason?: string }`

### 2.4 Admin Patient Management

**File**: `apps/api/src/modules/patients/routes.ts`

- `GET /patients` — admin list all patients (paginated, `?q=` search)
- `PATCH /patients/:id` — admin update patient profile

### 2.5 Admin Doctor Management

**File**: `apps/api/src/modules/doctors/routes.ts`

- `POST /doctors` — admin create doctor account (User + Doctor profile)
- `DELETE /doctors/:id` — admin deactivate doctor

### 2.6 Waiting Time Estimation

**File**: `apps/api/src/modules/queue/routes.ts`

- `GET /queue/today/:doctorId/wait-time`
- Logic: patients ahead × consultation duration

### 2.7 Admin Analytics Endpoints

**File**: `apps/api/src/modules/admin/routes.ts` (new)

- `GET /admin/analytics/today`
- Returns: appointment counts, completion rate, no-show rate, avg wait time, active doctors

---

## Phase 3: Frontend Infrastructure

**Goal**: Set up the foundation before building features.

### 3.1 Install & Configure Tailwind CSS

**Dependencies**: `tailwindcss`, `@tailwindcss/vite` (v4) or `postcss` + `autoprefixer` (v3)

**Files**:
- `apps/web/package.json` — add dependencies
- `apps/web/src/index.css` (new) — Tailwind directives
- `apps/web/vite.config.ts` — add Tailwind plugin
- `apps/web/tailwind.config.js` (if v3) — custom theme with healthcare green palette

**Delete**: `apps/web/src/styles.css` (replaced by Tailwind)

Custom theme colors:
```
primary:  #173c38, #23534b, #387c6d
accent:   #b8d98b, #dcebd2, #edf5e7
surface:  #f6f8f5, #fff
```

Fonts: DM Sans (body), Playfair Display (headings)

### 3.2 Install React Router

**Dependency**: `react-router-dom`

**File**: `apps/web/src/main.tsx` — set up route structure:

```
Public:    /login, /register
Patient:   /, /doctors, /doctors/:id, /appointments, /queue, /records, /profile
Doctor:    /doctor, /doctor/schedule, /doctor/leaves, /doctor/queue, /doctor/consultation/:id
Admin:     /admin, /admin/clinics, /admin/departments, /admin/doctors, /admin/patients, /admin/audit
```

### 3.3 API Client Layer

**File**: `apps/web/src/lib/api.ts` (new)

- `request<T>(path, options)` — generic fetch wrapper with auth token injection
- Typed API methods: `api.login()`, `api.register()`, `api.getDoctors()`, etc.
- Error handling: extracts `error.message` from API responses
- Base URL from `import.meta.env.VITE_API_URL`

### 3.4 Auth Context

**File**: `apps/web/src/context/AuthContext.tsx` (new)

- `AuthState`: `{ user, token, isLoading }`
- Provides: `login()`, `register()`, `logout()`, `user`, `token`
- Persists token in localStorage
- On mount: checks localStorage for token

### 3.5 Route Guards

**File**: `apps/web/src/components/ProtectedRoute.tsx` (new)

- Checks auth context for logged-in user
- Checks user role matches required role
- Redirects to `/login` if not authenticated
- Redirects to appropriate dashboard if wrong role

### 3.6 Layout Components

**Files**:
- `apps/web/src/components/Layouts/Sidebar.tsx` — role-aware sidebar navigation
- `apps/web/src/components/Layouts/DashboardLayout.tsx` — sidebar + main content wrapper
- `apps/web/src/components/Layouts/AuthLayout.tsx` — centered card layout for login/register

### 3.7 Shared UI Components

**Directory**: `apps/web/src/components/ui/`

| Component | Purpose |
|-----------|---------|
| `Button.tsx` | Variants: primary, secondary, outline, danger, ghost |
| `Card.tsx` | Container with header, body, footer slots |
| `Input.tsx` | Text/email/password/number with label + error |
| `Select.tsx` | Dropdown with label + error |
| `Textarea.tsx` | Multiline input |
| `Modal.tsx` | Overlay dialog with close button |
| `Spinner.tsx` | Loading indicator |
| `Toast.tsx` | Success/error notification popup |
| `Pagination.tsx` | Page controls (prev/next/page numbers) |
| `Badge.tsx` | Status badges (colors for statuses) |
| `EmptyState.tsx` | "No data" placeholder |
| `SearchInput.tsx` | Input with search icon + debounce |

---

## Phase 4: Auth Pages

**Goal**: The entry point for all users.

### 4.1 Login Page

**File**: `apps/web/src/pages/Login.tsx` (new)

- Email + password form
- "Forgot password?" link (placeholder)
- "Don't have an account? Register" link
- Calls `api.login()`, stores token, redirects based on role:
  - PATIENT → `/`
  - DOCTOR → `/doctor`
  - ADMIN → `/admin`

### 4.2 Registration Page

**File**: `apps/web/src/pages/Register.tsx` (new)

- Name, email, password, confirm password form
- Only patient registration (backend restricts role)
- "Already have an account? Login" link
- Calls `api.register()`, stores token, redirects to `/`

### 4.3 Password Change

**File**: `apps/web/src/pages/ChangePassword.tsx` (new)

- Current password, new password, confirm new password
- Accessible from profile page

---

## Phase 5: Patient Flow

**Goal**: Patient-facing features.

### 5.1 Patient Dashboard

**File**: `apps/web/src/pages/patient/Dashboard.tsx` (new)

- Welcome header with user name
- "Upcoming appointments" card (next 3-5)
- "Quick actions" cards: Find a doctor, My records, My prescriptions
- Recent notifications

### 5.2 Doctor Browse/Search

**File**: `apps/web/src/pages/patient/DoctorBrowse.tsx` (new)

- Search input (by name/specialization)
- Department filter dropdown
- Doctor cards grid: avatar, name, specialization, fee, clinic
- Pagination

### 5.3 Doctor Profile

**File**: `apps/web/src/pages/patient/DoctorProfile.tsx` (new)

- Doctor info header (name, specialization, qualification, fee)
- Weekly schedule display
- Available slots calendar (calls `/doctors/:id/availability`)
- "Book appointment" button

### 5.4 Appointment Booking Flow

**File**: `apps/web/src/pages/patient/BookAppointment.tsx` (new)

- Step 1: Select date (from available dates)
- Step 2: Select time slot (from available slots)
- Step 3: Enter reason (optional)
- Step 4: Confirm → calls `POST /appointments`
- Step 5: Success screen

### 5.5 My Appointments

**File**: `apps/web/src/pages/patient/MyAppointments.tsx` (new)

- Tabs: Upcoming / Past / Cancelled
- Appointment cards with status badge and actions
- Cancel: confirmation modal → `POST /appointments/:id/cancel`
- Check-in: `POST /appointments/:id/check-in` → shows queue token

### 5.6 Queue Status

**File**: `apps/web/src/pages/patient/QueueStatus.tsx` (new)

- Current queue position, patients ahead, estimated wait time
- Doctor name and currently serving token
- Auto-refresh every 30 seconds

### 5.7 My Records

**File**: `apps/web/src/pages/patient/MyRecords.tsx` (new)

- Tabs: Consultations / Prescriptions / Follow-ups
- Consultations: date, doctor, diagnosis
- Prescriptions: medicine list with dosage details
- Follow-ups: scheduled date, doctor, reason

### 5.8 Patient Profile

**File**: `apps/web/src/pages/patient/Profile.tsx` (new)

- View/edit: name, DOB, gender, phone, address, emergency contact
- Change password link

---

## Phase 6: Doctor Flow

**Goal**: Doctor-facing features.

### 6.1 Doctor Dashboard

**File**: `apps/web/src/pages/doctor/Dashboard.tsx` (new)

- Today's stats: total appointments, completed, in queue, waiting
- Upcoming appointments list
- Quick actions: Manage schedule, View queue

### 6.2 Schedule Management

**File**: `apps/web/src/pages/doctor/Schedule.tsx` (new)

- Weekly grid (Mon-Sun × time slots)
- Add/edit/delete time slots per day
- Bulk replace option

### 6.3 Leave Management

**File**: `apps/web/src/pages/doctor/Leaves.tsx` (new)

- List of upcoming leaves
- Add leave form: date range + reason
- Delete leave button

### 6.4 Doctor Queue View

**File**: `apps/web/src/pages/doctor/Queue.tsx` (new)

- Today's queue list ordered by token
- Each patient card with actions: Call next, Skip, Serve/Complete
- Currently serving highlight
- Auto-refresh

### 6.5 Consultation Form

**File**: `apps/web/src/pages/doctor/Consultation.tsx` (new)

- Patient info header with previous visits link
- Form: notes, symptoms, diagnosis, treatment
- Prescription section: dynamic medicine list (add/remove rows)
  - Each row: medicine, dosage, frequency, timing, duration
- Optional: advice, schedule follow-up
- Submit → `POST /consultations`

### 6.6 Patient History

**File**: `apps/web/src/pages/doctor/PatientHistory.tsx` (new)

- Previous consultations with expandable details
- Prescription history
- Follow-up history

---

## Phase 7: Admin Flow

**Goal**: Admin-facing features.

### 7.1 Admin Dashboard

**File**: `apps/web/src/pages/admin/Dashboard.tsx` (new)

- Today's overview cards: total appointments, completed, cancelled, no-shows
- Average waiting time, active doctors
- Department popularity
- Recent audit log activity

### 7.2 Clinic Management

**File**: `apps/web/src/pages/admin/Clinics.tsx` (new)

- Clinics list with search
- Add/edit/delete clinic
- Delete blocked if doctors/departments exist

### 7.3 Department Management

**File**: `apps/web/src/pages/admin/Departments.tsx` (new)

- Departments list with search
- Add/edit/delete department
- Delete blocked if doctors assigned

### 7.4 Doctor Management

**File**: `apps/web/src/pages/admin/Doctors.tsx` (new)

- Doctors list with search/filter
- Add doctor (create user + doctor profile)
- Edit doctor details
- Deactivate doctor

### 7.5 Patient Management

**File**: `apps/web/src/pages/admin/Patients.tsx` (new)

- Patients list with search
- View/edit patient profile

### 7.6 Audit Log Viewer

**File**: `apps/web/src/pages/admin/AuditLogs.tsx` (new)

- Filterable list: by user, action, entity, date range
- Pagination

---

## File Summary

### New Files (~35)

| Phase | Files |
|-------|-------|
| 1 | `apps/api/src/middleware/sanitize.ts` |
| 2 | `apps/api/src/modules/notifications/routes.ts`, `apps/api/src/middleware/audit.ts`, `apps/api/src/lib/notify.ts`, `apps/api/src/modules/admin/routes.ts` |
| 3 | `apps/web/src/lib/api.ts`, `apps/web/src/context/AuthContext.tsx`, `apps/web/src/components/ProtectedRoute.tsx`, `apps/web/src/components/Layouts/Sidebar.tsx`, `apps/web/src/components/Layouts/DashboardLayout.tsx`, `apps/web/src/components/Layouts/AuthLayout.tsx`, `apps/web/src/components/ui/*.tsx` (12 files) |
| 4 | `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Register.tsx`, `apps/web/src/pages/ChangePassword.tsx` |
| 5 | `apps/web/src/pages/patient/Dashboard.tsx`, `DoctorBrowse.tsx`, `DoctorProfile.tsx`, `BookAppointment.tsx`, `MyAppointments.tsx`, `QueueStatus.tsx`, `MyRecords.tsx`, `Profile.tsx` |
| 6 | `apps/web/src/pages/doctor/Dashboard.tsx`, `Schedule.tsx`, `Leaves.tsx`, `Queue.tsx`, `Consultation.tsx`, `PatientHistory.tsx` |
| 7 | `apps/web/src/pages/admin/Dashboard.tsx`, `Clinics.tsx`, `Departments.tsx`, `Doctors.tsx`, `Patients.tsx`, `AuditLogs.tsx` |

### Modified Files (~16)

| Phase | Files |
|-------|-------|
| 1-2 | `apps/api/src/modules/auth/routes.ts`, `appointments/routes.ts`, `queue/routes.ts`, `doctors/routes.ts`, `departments/routes.ts`, `clinics/routes.ts`, `consultations/routes.ts`, `patients/routes.ts`, `schedules/routes.ts`, `leaves/routes.ts`, `apps/api/src/server.ts`, `apps/api/src/lib/auth.ts` |
| 3 | `apps/web/src/main.tsx`, `apps/web/vite.config.ts`, `apps/web/package.json` |

---

## Phase 8: Database Setup, Seeding & Production Build

Database is connected (PostgreSQL on port 4000, `healthcare` database) and all 15 tables exist but are empty. This phase wires up migration history, seeds the database with usable data, and verifies the frontend production build.

### 8.1 Prisma Migration History

The tables were created outside of `prisma migrate`, so there's no migration directory. Fix this to enable future `prisma migrate dev` and `prisma migrate deploy` workflows.

```bash
cd apps/api
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init
```

This captures the current schema as the baseline migration without re-creating tables.

### 8.2 Seed Script (`prisma/seed.ts`)

Create a comprehensive seed that provides a fully working demo environment:

| Seed Data | Details |
|-----------|---------|
| **Admin user** | `admin@careflow.com` / `admin123` |
| **2 clinics** | `CareFlow Main Clinic`, `CareFlow City Branch` |
| **Departments** | Cardiology, Neurology, General Medicine (under Main Clinic); Pediatrics, Dermatology (under City Branch) |
| **3 doctors** | With schedules (Mon-Fri 9-5), specializations, qualifications |
| **1 test patient** | `patient@careflow.com` / `patient123` |
| **Sample appointments** | 2–3 in PENDING status for the test patient |
| **Sample schedule entries** | Mon–Fri for each doctor |

Register the seed in `package.json`:
```json
"prisma": { "seed": "npx tsx prisma/seed.ts" }
```

### 8.3 Run Migration + Seed

```bash
cd apps/api
npx prisma db seed
```

### 8.4 Frontend Production Build

Verify Vite can build the frontend for production:

```bash
cd apps/web
npm run build
```

Fix any build errors (missing imports, tree-shaking issues, etc.).

### 8.5 Change Password Page

The API endpoint (`PATCH /auth/password`) exists but there's no dedicated frontend page. Create `apps/web/src/pages/ChangePassword.tsx` accessible from the profile page for all roles.

### 8.6 New Files

| File | Purpose |
|------|---------|
| `apps/api/prisma/migrations/0_init/migration.sql` | Baseline migration |
| `apps/api/prisma/seed.ts` | Database seed script |

### 8.7 Modified Files

| File | Change |
|------|--------|
| `apps/api/package.json` | Add `prisma.seed` config |
| `apps/web/src/pages/patient/Profile.tsx` | Add "Change Password" link |
| `apps/web/src/pages/doctor/ProfileEdit.tsx` | Add "Change Password" link |
| `apps/web/src/main.tsx` | Add ChangePassword route |

---

## Execution Order

1. **Phase 1** first — security fixes are non-negotiable before building UI
2. **Phase 2** next — complete the API surface
3. **Phase 3** — frontend foundation (Tailwind, router, auth context, components)
4. **Phase 4** — auth pages (login/register) so users can access the app
5. **Phase 5** — patient flow (the primary user journey)
6. **Phase 6** — doctor flow (schedule, queue, consultations)
7. **Phase 7** — admin flow (management and analytics)
8. **Phase 8** — database setup, seeding, production build verification, change password page

Each phase should be tested before moving to the next.
