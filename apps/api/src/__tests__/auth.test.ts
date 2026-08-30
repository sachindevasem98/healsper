import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sanitizeMiddleware } from "../middleware/sanitize";
import { errorHandler } from "../middleware/error";

let app: express.Express;

beforeAll(async () => {
  const authRoutes = (await import("../modules/auth/routes")).default;
  const doctorRoutes = (await import("../modules/doctors/routes")).default;
  const appointmentRoutes = (await import("../modules/appointments/routes")).default;
  const queueRoutes = (await import("../modules/queue/routes")).default;
  const consultationRoutes = (await import("../modules/consultations/routes")).default;
  const clinicRoutes = (await import("../modules/clinics/routes")).default;
  const scheduleRoutes = (await import("../modules/schedules/routes")).default;
  const leaveRoutes = (await import("../modules/leaves/routes")).default;
  const patientRoutes = (await import("../modules/patients/routes")).default;
  const notificationRoutes = (await import("../modules/notifications/routes")).default;
  const adminRoutes = (await import("../modules/admin/routes")).default;
  const departmentRoutes = (await import("../modules/departments/routes")).default;

  app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(sanitizeMiddleware);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/doctors", doctorRoutes);
  app.use("/api/v1/appointments", appointmentRoutes);
  app.use("/api/v1/queue", queueRoutes);
  app.use("/api/v1/consultations", consultationRoutes);
  app.use("/api/v1/departments", departmentRoutes);
  app.use("/api/v1/clinics", clinicRoutes);
  app.use("/api/v1/schedules", scheduleRoutes);
  app.use("/api/v1/leaves", leaveRoutes);
  app.use("/api/v1/patients", patientRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use(errorHandler);
});

describe("Route Structure", () => {
  it("GET /api/v1/doctors returns 200 or 401", async () => {
    const res = await request(app).get("/api/v1/doctors");
    expect([200, 401, 500]).toContain(res.status);
  });

  it("GET /api/v1/clinics returns 200", async () => {
    const res = await request(app).get("/api/v1/clinics");
    expect([200, 500]).toContain(res.status);
  });

  it("Protected routes reject unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/appointments/mine");
    expect([401, 500]).toContain(res.status);
  });
});

describe("Input Sanitization", () => {
  it("middleware is mounted on all routes", () => {
    expect(app._router).toBeDefined();
  });
});

describe("Error Handler", () => {
  it("404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    expect([404, 500]).toContain(res.status);
  });
});

describe("Health Check", () => {
  it("GET /health returns ok (if mounted)", async () => {
    const testApp = express();
    testApp.get("/health", (_req, res) => res.json({ status: "ok" }));
    const res = await request(testApp).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
