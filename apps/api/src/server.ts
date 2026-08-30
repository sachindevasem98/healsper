import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { config } from "./config";
import { sanitizeMiddleware } from "./middleware/sanitize";
import { auditMiddleware } from "./middleware/audit";
import { errorHandler } from "./middleware/error";
import { setupSocket } from "./lib/socket";
import { prisma } from "./lib/prisma";
import authRoutes from "./modules/auth/routes";
import doctorRoutes from "./modules/doctors/routes";
import appointmentRoutes from "./modules/appointments/routes";
import queueRoutes from "./modules/queue/routes";
import consultationRoutes from "./modules/consultations/routes";
import departmentRoutes from "./modules/departments/routes";
import clinicRoutes from "./modules/clinics/routes";
import scheduleRoutes from "./modules/schedules/routes";
import leaveRoutes from "./modules/leaves/routes";
import patientRoutes from "./modules/patients/routes";
import notificationRoutes from "./modules/notifications/routes";
import adminRoutes from "./modules/admin/routes";

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: config.WEB_ORIGIN, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

// Trust the platform ingress proxy so rate limiting and req.ip see real client IPs.
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeMiddleware);
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

// Stricter brute-force protection on credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/refresh", authLimiter);

// Health check
app.get("/health", (_req, res) =>
  res.json({ success: true, data: { service: "healthcare-api", status: "ok" } })
);

// Readiness — verifies the database connection is live (used for deep health checks).
app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.json({ success: true, data: { service: "healthcare-api", readiness: "ready" } });
  } catch {
    res.status(503).json({ success: false, error: { code: "NOT_READY", message: "Database unavailable" } });
  }
});

// Routes
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

// Audit logging (after routes, before error handler)
app.use(auditMiddleware);

// Error handler
app.use(errorHandler);

// Setup WebSocket
setupSocket(io);

// Make io accessible for route handlers
app.set("io", io);

httpServer.listen(config.PORT, () =>
  console.log(`Healthcare API listening on port ${config.PORT}`)
);

// Graceful shutdown — close listeners and DB connections on SIGTERM/SIGINT.
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);
  httpServer.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
