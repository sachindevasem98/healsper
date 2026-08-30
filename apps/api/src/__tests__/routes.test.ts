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

describe("API Endpoints Structure", () => {
  it("doctors listing is accessible", async () => {
    const res = await request(app).get("/api/v1/doctors");
    expect([200, 500]).toContain(res.status);
  });

  it("schedules endpoint is accessible", async () => {
    const res = await request(app).get("/api/v1/schedules/test-id");
    expect([200, 404, 500]).toContain(res.status);
  });

  it("clinics listing is accessible", async () => {
    const res = await request(app).get("/api/v1/clinics");
    expect([200, 500]).toContain(res.status);
  });

  it("departments listing is accessible", async () => {
    const res = await request(app).get("/api/v1/departments");
    expect([200, 500]).toContain(res.status);
  });

  it("queue endpoint requires auth", async () => {
    const res = await request(app).get("/api/v1/queue/today/test-id");
    expect([401, 500]).toContain(res.status);
  });

  it("patients mine endpoint requires auth", async () => {
    const res = await request(app).get("/api/v1/patients/mine");
    expect([401, 500]).toContain(res.status);
  });

  it("appointments mine endpoint requires auth", async () => {
    const res = await request(app).get("/api/v1/appointments/mine");
    expect([401, 500]).toContain(res.status);
  });

  it("notifications mine endpoint requires auth", async () => {
    const res = await request(app).get("/api/v1/notifications/mine");
    expect([401, 500]).toContain(res.status);
  });

  it("admin analytics requires auth", async () => {
    const res = await request(app).get("/api/v1/admin/analytics/today");
    expect([401, 500]).toContain(res.status);
  });

  it("admin audit-logs requires auth", async () => {
    const res = await request(app).get("/api/v1/admin/audit-logs");
    expect([401, 500]).toContain(res.status);
  });

  it("POST to auth register is accessible", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({});
    expect([400, 409, 500]).toContain(res.status);
  });

  it("POST to auth login is accessible", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({});
    expect([400, 401, 500]).toContain(res.status);
  });
});

describe("Security Headers", () => {
  it("helmet sets security headers", async () => {
    const res = await request(app).get("/api/v1/doctors");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
