import { Router } from "express";
import { AppointmentStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";
import { emitToAdmins } from "../../lib/socket";
import { dayBoundsUtc } from "../../lib/dayBounds";

const router = Router();
router.use(requireAuth);

function bumpOverview(req: any) {
  const io = req.app.get("io");
  if (io) emitToAdmins(io, "overview:changed", { at: new Date() });
}

// Notify every administrator of a schedule change and ping the admin room so
// their notification bells update instantly.
async function notifyAdmins(req: any, title: string, message: string) {
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.notification
    .createMany({
      data: admins.map((admin) => ({ userId: admin.id, title, message })),
    })
    .catch(() => {});
  const io = req.app.get("io");
  if (io) emitToAdmins(io, "notification:created", { at: new Date() });
}

// --- Valid status transitions ---

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.CHECKED_IN]: [AppointmentStatus.WAITING, AppointmentStatus.CANCELLED],
  [AppointmentStatus.WAITING]: [AppointmentStatus.IN_CONSULTATION, AppointmentStatus.CANCELLED],
  [AppointmentStatus.IN_CONSULTATION]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.RESCHEDULED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

// --- GET /mine + /doctor (role-filtered, with date range / status filters) ---

async function listAppointments(req: any, res: any) {
  const roleWhere =
    req.user.role === Role.PATIENT
      ? { patient: { userId: req.user.id } }
      : req.user.role === Role.DOCTOR
      ? { doctor: { userId: req.user.id } }
      : {};

  // Optional "?date=today" filter — evaluated against the client's local day so
  // IST/UTC (and any other) offsets don't shift which day an appointment falls on.
  const date = (req.query.date as string) || undefined;
  const tz = (req.query.tz as string) || undefined;

  // range: upcoming (startsAt >= now) | past (startsAt < now) — no default "today".
  const range = (req.query.range as string) || undefined;
  const status = (req.query.status as string) || undefined;

  const fromRaw = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const toRaw = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  const from = fromRaw && !isNaN(fromRaw.getTime()) ? fromRaw : undefined;
  const to = toRaw && !isNaN(toRaw.getTime()) ? toRaw : undefined;

  const conditions: Record<string, unknown>[] = [];

  if (date === "today") {
    let bounds: { start: Date; end: Date };
    try {
      bounds = dayBoundsUtc(tz);
    } catch {
      bounds = dayBoundsUtc();
    }
    conditions.push({ startsAt: { gte: bounds.start, lt: bounds.end } });
  }

  const now = new Date();
  if (range === "upcoming") conditions.push({ startsAt: { gte: now } });
  else if (range === "past") conditions.push({ startsAt: { lt: now } });

  if (from) conditions.push({ startsAt: { gte: from } });
  if (to) conditions.push({ startsAt: { lt: to } });

  const where: Record<string, unknown> = { ...roleWhere, deletedAt: null };
  if (conditions.length === 1) {
    Object.assign(where, conditions[0]);
  } else if (conditions.length > 1) {
    where.AND = conditions;
  }

  if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
    where.status = status;
  }

  const orderBy = range === "past" ? { startsAt: "desc" as const } : { startsAt: "asc" as const };

  const items = await prisma.appointment.findMany({
    where,
    include: {
      patient: { include: { user: { select: { name: true } } } },
      doctor: { include: { user: { select: { name: true } } } },
      queueEntry: true,
      consultation: true,
    },
    orderBy,
  });

  res.json({ success: true, data: items });
}

router.get("/mine", asyncHandler(listAppointments));

router.get("/doctor", requireRole(Role.DOCTOR), asyncHandler(listAppointments));

// --- POST / (patient books appointment) ---

router.post(
  "/",
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        doctorId: z.string(),
        startsAt: z.coerce.date(),
        reason: z.string().max(500).optional(),
      })
      .parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) throw new AppError(404, "Patient profile not found", "NOT_FOUND");

    const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
    if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

    const endsAt = new Date(input.startsAt.getTime() + doctor.consultationDuration * 60000);

    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          startsAt: input.startsAt,
          deletedAt: null,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        },
      });
      if (conflict) {
        throw new AppError(409, "The selected slot is no longer available", "APPOINTMENT_SLOT_UNAVAILABLE");
      }

      return tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          startsAt: input.startsAt,
          endsAt,
          reason: input.reason,
          status: AppointmentStatus.CONFIRMED,
        },
        include: { doctor: { include: { user: { select: { name: true } } } } },
      });
    });

    res.status(201).json({ success: true, data: appointment });
    bumpOverview(req);
  })
);

// --- PATCH /:id/status (with RBAC + state machine) ---

router.patch(
  "/:id/status",
  asyncHandler(async (req: any, res) => {
    const { status: newStatus } = z
      .object({ status: z.nativeEnum(AppointmentStatus) })
      .parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: true, doctor: true },
    });
    if (!appointment) throw new AppError(404, "Appointment not found", "NOT_FOUND");

    // RBAC checks
    if (req.user.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        throw new AppError(403, "You can only modify your own appointments", "FORBIDDEN");
      }
      // Patients can only cancel
      if (newStatus !== AppointmentStatus.CANCELLED) {
        throw new AppError(403, "Patients can only cancel appointments", "FORBIDDEN");
      }
    } else if (req.user.role === Role.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new AppError(403, "You can only modify appointments for your patients", "FORBIDDEN");
      }
    }
    // ADMIN passes through

    // State machine check
    const allowed = VALID_TRANSITIONS[appointment.status];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        400,
        `Cannot transition from ${appointment.status} to ${newStatus}`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });

    bumpOverview(req);

    res.json({ success: true, data: updated });
  })
);

// --- POST /:id/cancel ---

router.post(
  "/:id/cancel",
  asyncHandler(async (req: any, res) => {
    const { reason } = z
      .object({ reason: z.string().trim().min(2).max(500).optional() })
      .parse(req.body);

    if (req.user.role === Role.DOCTOR && !reason) {
      throw new AppError(400, "A reason is required when cancelling an appointment", "REASON_REQUIRED");
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { userId: true, user: { select: { name: true } } } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });
    if (!appointment) throw new AppError(404, "Appointment not found", "NOT_FOUND");

    // RBAC
    if (req.user.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        throw new AppError(403, "You can only cancel your own appointments", "FORBIDDEN");
      }
    } else if (req.user.role === Role.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new AppError(403, "You can only cancel appointments for your patients", "FORBIDDEN");
      }
    }

    // State check — only PENDING or CONFIRMED can be cancelled
    if (!VALID_TRANSITIONS[appointment.status].includes(AppointmentStatus.CANCELLED)) {
      throw new AppError(400, `Cannot cancel an appointment in ${appointment.status} status`, "INVALID_STATUS_TRANSITION");
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        status: AppointmentStatus.CANCELLED,
        ...(reason ? { statusReason: reason } : {}),
      },
    });

    // Notify the patient when a staff member initiates the cancellation.
    if (req.user.role !== Role.PATIENT) {
      const doctorName = appointment.doctor?.user?.name || "your doctor";
      const when = new Date(appointment.startsAt).toLocaleString();
      await prisma.notification
        .create({
          data: {
            userId: appointment.patient.userId,
            title: "Appointment Cancelled",
            message: `Your appointment with Dr. ${doctorName} on ${when} was cancelled${reason ? `\nReason: ${reason}` : ""}.`,
          },
        })
        .catch(() => {});
    }

    // Keep the admin team in the loop when a doctor cancels a booking.
    if (req.user.role === Role.DOCTOR) {
      const doctorName = appointment.doctor?.user?.name || "their doctor";
      const patientName = appointment.patient?.user?.name || "a patient";
      const when = new Date(appointment.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      await notifyAdmins(
        req,
        "Appointment Cancelled",
        `Dr. ${doctorName} cancelled an appointment with ${patientName} on ${when}.${reason ? ` Reason: ${reason}` : ""}`
      );
    }

    bumpOverview(req);

    res.json({ success: true, data: updated });
  })
);

// --- POST /:id/reschedule ---

router.post(
  "/:id/reschedule",
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        startsAt: z.coerce.date(),
        reason: z.string().trim().min(2).max(500).optional(),
      })
      .parse(req.body);

    if (req.user.role === Role.DOCTOR && !input.reason) {
      throw new AppError(400, "A reason is required when rescheduling an appointment", "REASON_REQUIRED");
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { userId: true, user: { select: { name: true } } } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });
    if (!appointment) throw new AppError(404, "Appointment not found", "NOT_FOUND");

    // RBAC — doctors may reschedule their own appointments.
    if (req.user.role === Role.PATIENT) {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        throw new AppError(403, "You can only reschedule your own appointments", "FORBIDDEN");
      }
    } else if (req.user.role === Role.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new AppError(403, "You can only reschedule appointments for your patients", "FORBIDDEN");
      }
    }

    // State check
    if (!VALID_TRANSITIONS[appointment.status].includes(AppointmentStatus.CANCELLED)) {
      throw new AppError(400, `Cannot reschedule an appointment in ${appointment.status} status`, "INVALID_STATUS_TRANSITION");
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: appointment.doctorId } });
    if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

    const newEndsAt = new Date(input.startsAt.getTime() + doctor.consultationDuration * 60000);

    const newAppointment = await prisma.$transaction(async (tx) => {
      // Check conflict for new slot
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId: appointment.doctorId,
          startsAt: input.startsAt,
          deletedAt: null,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.RESCHEDULED] },
        },
      });
      if (conflict) {
        throw new AppError(409, "The selected slot is no longer available", "APPOINTMENT_SLOT_UNAVAILABLE");
      }

      // Mark old appointment as RESCHEDULED (record the reason on it)
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.RESCHEDULED,
          ...(input.reason ? { statusReason: input.reason } : {}),
        },
      });

      // Create new appointment
      return tx.appointment.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          startsAt: input.startsAt,
          endsAt: newEndsAt,
          reason: appointment.reason,
          status: AppointmentStatus.CONFIRMED,
        },
        include: { doctor: { include: { user: { select: { name: true } } } } },
      });
    });

    // Notify the patient when a staff member reschedules.
    if (req.user.role !== Role.PATIENT) {
      const doctorName = appointment.doctor?.user?.name || "your doctor";
      const when = new Date(input.startsAt).toLocaleString();
      await prisma.notification
        .create({
          data: {
            userId: appointment.patient.userId,
            title: "Appointment Rescheduled",
            message: `Your appointment with Dr. ${doctorName} was rescheduled to ${when}${input.reason ? `\nReason: ${input.reason}` : ""}.`,
          },
        })
        .catch(() => {});
    }

    // Keep the admin team in the loop when a doctor reschedules a booking.
    if (req.user.role === Role.DOCTOR) {
      const doctorName = appointment.doctor?.user?.name || "their doctor";
      const patientName = appointment.patient?.user?.name || "a patient";
      const when = new Date(input.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      await notifyAdmins(
        req,
        "Appointment Rescheduled",
        `Dr. ${doctorName} rescheduled an appointment with ${patientName}. New time: ${when}.${input.reason ? ` Reason: ${input.reason}` : ""}`
      );
    }

    bumpOverview(req);

    res.status(201).json({ success: true, data: newAppointment });
  })
);

// --- POST /:id/check-in ---

router.post(
  "/:id/check-in",
  requireRole(Role.PATIENT),
  asyncHandler(async (req: any, res) => {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        deletedAt: null,
        patient: { userId: req.user.id },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      },
    });
    if (!appointment) {
      throw new AppError(404, "Check-in is not available for this appointment", "NOT_FOUND");
    }

    const dayStart = new Date(appointment.startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const latest = await prisma.queueEntry.findFirst({
      where: {
        appointment: {
          doctorId: appointment.doctorId,
          startsAt: { gte: dayStart, lt: dayEnd },
        },
      },
      orderBy: { token: "desc" },
    });

    const result = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.WAITING },
      }),
      prisma.queueEntry.create({
        data: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          token: (latest?.token ?? 0) + 1,
        },
      }),
    ]);

    bumpOverview(req);

    res.json({ success: true, data: result[1] });
  })
);

// --- DELETE /:id (admin soft-delete) ---

router.delete(
  "/:id",
  requireRole(Role.ADMIN),
  asyncHandler(async (req: any, res) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
    });
    if (!appointment) throw new AppError(404, "Appointment not found", "NOT_FOUND");
    if (appointment.deletedAt) {
      throw new AppError(400, "Appointment has already been deleted", "ALREADY_DELETED");
    }

    // Soft delete: keep the row for audit / clinical history, hide it from live views
    // and free its slot for rebooking.
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    bumpOverview(req);

    res.json({ success: true, data: updated });
  })
);

export default router;
