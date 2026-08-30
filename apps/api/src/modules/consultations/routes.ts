import { Router } from "express";
import { AppointmentStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";
import { paginationSchema, paginationParams, paginationMeta } from "../../lib/pagination";

const router = Router();
router.use(requireAuth);

// --- POST / (doctor creates consultation) ---

router.post(
  "/",
  requireRole(Role.DOCTOR),
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        appointmentId: z.string(),
        notes: z.string().optional(),
        symptoms: z.string().optional(),
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        prescription: z
          .object({
            diagnosis: z.string().optional(),
            advice: z.string().optional(),
            items: z.array(
              z.object({
                medicine: z.string(),
                dosage: z.string(),
                frequency: z.string(),
                timing: z.string().optional(),
                duration: z.string().optional(),
              })
            ),
          })
          .optional(),
      })
      .parse(req.body);

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) throw new AppError(404, "Doctor profile not found", "NOT_FOUND");

    const appointment = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, doctorId: doctor.id, deletedAt: null },
    });
    if (!appointment) throw new AppError(404, "Appointment not found", "NOT_FOUND");

    const consultation = await prisma.$transaction(async (tx) => {
      const record = await tx.consultation.create({
        data: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: doctor.id,
          notes: input.notes,
          symptoms: input.symptoms,
          diagnosis: input.diagnosis,
          treatment: input.treatment,
          prescription: input.prescription
            ? {
                create: {
                  diagnosis: input.prescription.diagnosis,
                  advice: input.prescription.advice,
                  patientId: appointment.patientId,
                  items: { create: input.prescription.items },
                },
              }
            : undefined,
        },
        include: { prescription: { include: { items: true } } },
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      });

      return record;
    });

    res.status(201).json({ success: true, data: consultation });
  })
);

// --- GET /patient/:patientId (with pagination) ---

router.get(
  "/patient/:patientId",
  requireRole(Role.DOCTOR, Role.ADMIN),
  asyncHandler(async (req, res) => {
    const pagination = paginationSchema.parse({ page: req.query.page, limit: req.query.limit });
    const patientId = String(req.params.patientId);

    const [data, total] = await Promise.all([
      prisma.consultation.findMany({
        where: { patientId },
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          prescription: { include: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        ...paginationParams(pagination),
      }),
      prisma.consultation.count({ where: { patientId } }),
    ]);

    res.json({ success: true, data, pagination: paginationMeta(total, pagination) });
  })
);

// --- POST /:id/follow-up (doctor schedules follow-up) ---

router.post(
  "/:id/follow-up",
  requireRole(Role.DOCTOR),
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        scheduledFor: z.coerce.date(),
        reason: z.string().max(300).optional(),
      })
      .parse(req.body);

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) throw new AppError(404, "Doctor profile not found", "NOT_FOUND");

    const consultation = await prisma.consultation.findUnique({
      where: { id: req.params.id },
    });
    if (!consultation) throw new AppError(404, "Consultation not found", "NOT_FOUND");
    if (consultation.doctorId !== doctor.id) {
      throw new AppError(403, "You can only schedule follow-ups for your own consultations", "FORBIDDEN");
    }

    const followUp = await prisma.followUp.create({
      data: {
        patientId: consultation.patientId,
        doctorId: doctor.id,
        appointmentId: consultation.appointmentId,
        scheduledFor: input.scheduledFor,
        reason: input.reason,
      },
    });

    res.status(201).json({ success: true, data: followUp });
  })
);

export default router;
