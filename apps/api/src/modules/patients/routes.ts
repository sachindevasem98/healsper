import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";
import { paginationSchema, paginationParams, paginationMeta } from "../../lib/pagination";

const router = Router();

// --- GET /mine ---

router.get(
  "/mine",
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id },
      include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    });
    if (!patient) throw new AppError(404, "Patient profile not found", "NOT_FOUND");
    res.json({ success: true, data: patient });
  })
);

// --- PATCH /mine ---

router.patch(
  "/mine",
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        dateOfBirth: z.coerce.date().optional(),
        gender: z.string().max(20).optional(),
        phone: z.string().max(20).optional(),
        address: z.string().max(300).optional(),
        emergencyContact: z.string().max(200).optional(),
      })
      .parse(req.body);

    const patient = await prisma.patient.update({
      where: { userId: req.user.id },
      data: input,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({ success: true, data: patient });
  })
);

// --- GET /mine/consultations (with pagination) ---

router.get(
  "/mine/consultations",
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!patient) throw new AppError(404, "Patient profile not found", "NOT_FOUND");

    const pagination = paginationSchema.parse({ page: req.query.page, limit: req.query.limit });

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          prescription: { include: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        ...paginationParams(pagination),
      }),
      prisma.consultation.count({ where: { patientId: patient.id } }),
    ]);

    res.json({ success: true, data: consultations, pagination: paginationMeta(total, pagination) });
  })
);

// --- GET /mine/prescriptions (with pagination) ---

router.get(
  "/mine/prescriptions",
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!patient) throw new AppError(404, "Patient profile not found", "NOT_FOUND");

    const pagination = paginationSchema.parse({ page: req.query.page, limit: req.query.limit });

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where: { patientId: patient.id },
        include: {
          items: true,
          consultation: { include: { doctor: { include: { user: { select: { name: true } } } } } },
        },
        orderBy: { createdAt: "desc" },
        ...paginationParams(pagination),
      }),
      prisma.prescription.count({ where: { patientId: patient.id } }),
    ]);

    res.json({ success: true, data: prescriptions, pagination: paginationMeta(total, pagination) });
  })
);

// --- GET /mine/follow-ups ---

router.get(
  "/mine/follow-ups",
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!patient) throw new AppError(404, "Patient profile not found", "NOT_FOUND");

    const followUps = await prisma.followUp.findMany({
      where: { patientId: patient.id },
      include: { doctor: { include: { user: { select: { name: true } } } } },
      orderBy: { scheduledFor: "asc" },
    });

    res.json({ success: true, data: followUps });
  })
);

// --- GET /mine/queue (active queue entry for patient) ---

router.get(
  "/mine/queue",
  requireAuth,
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!patient) throw new AppError(404, "Patient profile not found", "NOT_FOUND");

    const queueEntry = await prisma.queueEntry.findFirst({
      where: { patientId: patient.id, status: { in: ["WAITING", "CALLED"] } },
      include: { appointment: true },
      orderBy: { checkedInAt: "desc" },
    });

    if (!queueEntry) {
      return res.json({ success: true, data: { queueEntry: null, waitInfo: null } });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: queueEntry.appointment.doctorId },
      select: { consultationDuration: true },
    });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const patientsAhead = await prisma.queueEntry.count({
      where: {
        appointment: { doctorId: queueEntry.appointment.doctorId, startsAt: { gte: start, lt: end } },
        status: { in: ["WAITING", "CALLED"] },
        token: { lt: queueEntry.token },
      },
    });

    const waitInfo = {
      patientsAhead,
      estimatedMinutes: patientsAhead * (doctor?.consultationDuration ?? 15),
      consultationDuration: doctor?.consultationDuration ?? 15,
    };

    res.json({ success: true, data: { queueEntry, waitInfo } });
  })
);

// --- GET /:id (doctor/admin view patient) ---

router.get(
  "/:id",
  requireAuth,
  requireRole(Role.DOCTOR, Role.ADMIN),
  asyncHandler(async (req, res) => {
    const patient = await prisma.patient.findUnique({
      where: { id: String(req.params.id) },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        appointments: { orderBy: { startsAt: "desc" }, take: 10 },
      },
    });
    if (!patient) throw new AppError(404, "Patient not found", "NOT_FOUND");
    res.json({ success: true, data: patient });
  })
);

// --- GET / (admin list all patients with search + pagination) ---

router.get(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const pagination = paginationSchema.parse({ page: req.query.page, limit: req.query.limit });

    const where = q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
        orderBy: { user: { name: "asc" } },
        ...paginationParams(pagination),
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ success: true, data: patients, pagination: paginationMeta(total, pagination) });
  })
);

// --- PATCH /:id (admin update patient) ---

router.patch(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        dateOfBirth: z.coerce.date().optional(),
        gender: z.string().max(20).optional(),
        phone: z.string().max(20).optional(),
        address: z.string().max(300).optional(),
        emergencyContact: z.string().max(200).optional(),
      })
      .parse(req.body);

    const patient = await prisma.patient.update({
      where: { id: String(req.params.id) },
      data: input,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({ success: true, data: patient });
  })
);

export default router;
