import { Router } from "express";
import { AppointmentStatus, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { asyncHandler } from "../../lib/errors";
import { dayBoundsUtc } from "../../lib/dayBounds";

const router = Router();
router.use(requireAuth, requireRole(Role.ADMIN));

// --- GET /overview (dynamic today's metrics; tz-aware) ---

const overviewHandler = async (req: any, res: any) => {
  const tz = typeof req.query.tz === "string" && req.query.tz ? String(req.query.tz) : undefined;
  const { start: todayStart, end: todayEnd } = dayBoundsUtc(tz);

  const [
    totalAppointments,
    completed,
    cancelled,
    noShow,
    waiting,
    activeDoctors,
    patientsCheckedIn,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd }, deletedAt: null },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd }, status: AppointmentStatus.COMPLETED, deletedAt: null },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd }, status: AppointmentStatus.CANCELLED, deletedAt: null },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd }, status: AppointmentStatus.NO_SHOW, deletedAt: null },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd }, status: AppointmentStatus.WAITING, deletedAt: null },
    }),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: todayStart, lt: todayEnd },
        status: { in: [AppointmentStatus.WAITING, AppointmentStatus.IN_CONSULTATION, AppointmentStatus.COMPLETED] }, deletedAt: null,
      },
    }),
  ]);

  // Average wait time from queue entries today
  const queueEntries = await prisma.queueEntry.findMany({
    where: {
      checkedInAt: { gte: todayStart, lt: todayEnd },
      calledAt: { not: null },
    },
    select: { checkedInAt: true, calledAt: true },
  });

  const avgWaitMinutes =
    queueEntries.length > 0
      ? Math.round(
          queueEntries.reduce((sum, e) => {
            const wait = (e.calledAt!.getTime() - e.checkedInAt.getTime()) / 60000;
            return sum + wait;
          }, 0) / queueEntries.length
        )
      : 0;

  res.json({
    success: true,
    data: {
      totalAppointments,
      completed,
      cancelled,
      noShow,
      waiting,
      activeDoctors,
      patientsCheckedIn,
      avgWaitMinutes,
    },
  });
};

router.get("/overview", asyncHandler(overviewHandler));

// Backwards-compatible alias for the previous endpoint name
router.get("/analytics/today", asyncHandler(overviewHandler));

// --- GET /audit-logs (admin view audit logs with pagination) ---

router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.entity) where.entity = String(req.query.entity);
    if (req.query.userId) where.userId = String(req.query.userId);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

export default router;
