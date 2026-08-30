import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

const ACTION_MAP: Record<string, string> = {
  "POST /doctors": "CREATE_DOCTOR",
  "PUT /doctors/:id": "EDIT_DOCTOR",
  "PATCH /doctors/:id": "EDIT_DOCTOR",
  "DELETE /doctors/:id": "DELETE_DOCTOR",
  "POST /departments": "CREATE_DEPARTMENT",
  "PUT /departments/:id": "EDIT_DEPARTMENT",
  "PATCH /departments/:id": "EDIT_DEPARTMENT",
  "DELETE /departments/:id": "DELETE_DEPARTMENT",
  "POST /clinics": "CREATE_CLINIC",
  "PUT /clinics/:id": "EDIT_CLINIC",
  "PATCH /clinics/:id": "EDIT_CLINIC",
  "DELETE /clinics/:id": "DELETE_CLINIC",
  "POST /appointments": "APPOINTMENT_CREATED",
  "PATCH /appointments/:id/status": "APPOINTMENT_STATUS_UPDATED",
  "POST /appointments/:id/cancel": "APPOINTMENT_CANCELLED",
  "POST /appointments/:id/reschedule": "APPOINTMENT_RESCHEDULED",
  "DELETE /appointments/:id": "APPOINTMENT_DELETED",
};

function normalizePath(path: string): string {
  // /api/v1/doctors/abc123 -> /doctors/:id
  const parts = path.split("/").filter(Boolean).filter((p) => p !== "api" && p !== "v1");
  if (parts.length === 0) return path;
  const numericOrCuid = /^[a-z0-9]{8,}$/i;
  const normalized = parts.map((p) => (numericOrCuid.test(p) ? ":id" : p)).join("/");
  return `/${normalized}`;
}

export function auditMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Only log write operations
  if (!["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
    return next();
  }

  // Skip auth endpoints and health check
  if (req.path.includes("/auth/login") || req.path.includes("/auth/register") || req.path === "/health") {
    return next();
  }

  // Fire-and-forget audit log — don't block the request
  const user = (req as any).user;
  const entityId = typeof req.params?.id === "string" ? req.params.id : null;
  const entity = (req.path.split("/").filter(Boolean).find((p) => p !== "api" && p !== "v1") || "unknown").replace(":id", "");

  const key = `${req.method} ${normalizePath(req.path)}`;
  const action = ACTION_MAP[key] || `${req.method} ${normalizePath(req.path)}`;

  const metadata: any = { bodyKeys: req.body ? Object.keys(req.body) : undefined };
  if (action === "APPOINTMENT_STATUS_UPDATED" && req.body?.status) {
    metadata.status = String(req.body.status);
  }
  if (action === "APPOINTMENT_CANCELLED" || action === "APPOINTMENT_RESCHEDULED") {
    if (req.body?.status) metadata.status = String(req.body.status);
    if (req.body?.reason) metadata.reason = String(req.body.reason);
  }

  prisma.auditLog
    .create({
      data: {
        userId: user?.id || null,
        action,
        entity,
        entityId: entityId || null,
        metadata,
      },
    })
    .catch(() => {}); // Silently ignore audit log failures

  next();
}