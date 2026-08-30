import { Router, Request } from "express";
import { AppointmentStatus, QueueStatus, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";
import { emitToAdmins } from "../../lib/socket";

const router = Router();
router.use(requireAuth);

async function verifyDoctorOwnership(queueEntryId: string, userId: string) {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: queueEntryId },
    include: { appointment: { select: { doctorId: true } } },
  });
  if (!entry) throw new AppError(404, "Queue entry not found", "NOT_FOUND");
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor || entry.appointment.doctorId !== doctor.id) {
    throw new AppError(403, "You can only manage your own queue", "FORBIDDEN");
  }
  return entry;
}

function getIo(req: Request) {
  return req.app.get("io");
}

function bumpOverview(req: Request) {
  const io = getIo(req);
  if (io) emitToAdmins(io, "overview:changed", { at: new Date() });
}

// --- GET /today/:doctorId ---

router.get(
  "/today/:doctorId",
  asyncHandler(async (req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const entries = await prisma.queueEntry.findMany({
      where: {
        appointment: {
          doctorId: String(req.params.doctorId),
          deletedAt: null,
          startsAt: { gte: start, lt: end },
        },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        appointment: true,
      },
      orderBy: { token: "asc" },
    });

    res.json({ success: true, data: entries });
  })
);

// --- POST /:id/call ---

router.post(
  "/:id/call",
  requireRole(Role.DOCTOR, Role.ADMIN),
  asyncHandler(async (req: any, res) => {
    if (req.user.role === Role.DOCTOR) {
      await verifyDoctorOwnership(String(req.params.id), req.user.id);
    }

    const entry = await prisma.queueEntry.update({
      where: { id: String(req.params.id) },
      data: {
        status: QueueStatus.CALLED,
        calledAt: new Date(),
        appointment: { update: { status: AppointmentStatus.IN_CONSULTATION } },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        appointment: true,
      },
    });

    const io = getIo(req);
    if (io) {
      io.to(`queue:${entry.appointment.doctorId}`).emit("queue:updated", entry);
      io.to(`patient:${entry.patientId}`).emit("queue:status", { queueEntryId: entry.id, status: entry.status });
    }

    bumpOverview(req);

    res.json({ success: true, data: entry });
  })
);

// --- POST /:id/skip ---

router.post(
  "/:id/skip",
  requireRole(Role.DOCTOR, Role.ADMIN),
  asyncHandler(async (req: any, res) => {
    if (req.user.role === Role.DOCTOR) {
      await verifyDoctorOwnership(String(req.params.id), req.user.id);
    }

    const entry = await prisma.queueEntry.update({
      where: { id: String(req.params.id) },
      data: {
        status: QueueStatus.SKIPPED,
        appointment: { update: { status: AppointmentStatus.NO_SHOW } },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        appointment: true,
      },
    });

    const io = getIo(req);
    if (io) {
      io.to(`queue:${entry.appointment.doctorId}`).emit("queue:updated", entry);
      io.to(`patient:${entry.patientId}`).emit("queue:status", { queueEntryId: entry.id, status: entry.status });
    }

    bumpOverview(req);

    res.json({ success: true, data: entry });
  })
);

// --- POST /:id/serve ---

router.post(
  "/:id/serve",
  requireRole(Role.DOCTOR, Role.ADMIN),
  asyncHandler(async (req: any, res) => {
    if (req.user.role === Role.DOCTOR) {
      await verifyDoctorOwnership(String(req.params.id), req.user.id);
    }

    const entry = await prisma.queueEntry.update({
      where: { id: String(req.params.id) },
      data: {
        status: QueueStatus.SERVED,
        servedAt: new Date(),
        appointment: { update: { status: AppointmentStatus.COMPLETED } },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        appointment: true,
      },
    });

    const io = getIo(req);
    if (io) {
      io.to(`queue:${entry.appointment.doctorId}`).emit("queue:updated", entry);
      io.to(`patient:${entry.patientId}`).emit("queue:status", { queueEntryId: entry.id, status: entry.status });
    }

    bumpOverview(req);

    res.json({ success: true, data: entry });
  })
);

// --- GET /today/:doctorId/wait-time ---

router.get(
  "/today/:doctorId/wait-time",
  asyncHandler(async (req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const doctor = await prisma.doctor.findUnique({
      where: { id: String(req.params.doctorId) },
      select: { consultationDuration: true },
    });
    if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

    const patientsAhead = await prisma.queueEntry.count({
      where: {
        appointment: {
          doctorId: String(req.params.doctorId),
          deletedAt: null,
          startsAt: { gte: start, lt: end },
        },
        status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] },
      },
    });

    const estimatedMinutes = patientsAhead * doctor.consultationDuration;

    res.json({
      success: true,
      data: { patientsAhead, estimatedMinutes, consultationDuration: doctor.consultationDuration },
    });
  })
);

export default router;
