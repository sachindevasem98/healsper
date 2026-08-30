import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";
import { paginationSchema, paginationParams, paginationMeta } from "../../lib/pagination";

const router = Router();

// --- GET / (list with search + pagination) ---

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const pagination = paginationSchema.parse({ page: req.query.page, limit: req.query.limit });

    const where = q
      ? {
          OR: [
            { specialization: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : undefined;

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: {
          user: { select: { name: true } },
          clinic: true,
          departments: { include: { department: true } },
        },
        orderBy: { user: { name: "asc" } },
        ...paginationParams(pagination),
      }),
      prisma.doctor.count({ where }),
    ]);

    res.json({ success: true, data: doctors, pagination: paginationMeta(total, pagination) });
  })
);

// --- GET /me ---

router.get(
  "/me",
  requireAuth,
  requireRole(Role.DOCTOR),
  asyncHandler(async (req: any, res) => {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        clinic: true,
        departments: { include: { department: true } },
        schedules: true,
        leaves: true,
      },
    });
    if (!doctor) throw new AppError(404, "Doctor profile not found", "NOT_FOUND");
    res.json({ success: true, data: doctor });
  })
);

// --- PATCH /me ---

router.patch(
  "/me",
  requireAuth,
  requireRole(Role.DOCTOR),
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        specialization: z.string().max(100).optional(),
        qualification: z.string().max(150).optional(),
        consultationDuration: z.number().int().min(5).max(120).optional(),
        consultationFee: z.number().min(0).optional(),
        clinicId: z.string().optional(),
      })
      .parse(req.body);

    const doctor = await prisma.doctor.update({
      where: { userId: req.user.id },
      data: input,
      include: {
        user: { select: { id: true, name: true, email: true } },
        clinic: true,
        departments: { include: { department: true } },
      },
    });

    res.json({ success: true, data: doctor });
  })
);

// --- GET /:id ---

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doctor = await prisma.doctor.findUnique({
      where: { id: String(req.params.id) },
      include: {
        user: { select: { name: true } },
        clinic: true,
        departments: { include: { department: true } },
        schedules: true,
      },
    });
    if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");
    res.json({ success: true, data: doctor });
  })
);

// --- GET /:id/availability ---

router.get(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const from = new Date(String(req.query.from ?? new Date().toISOString()));
    const to = new Date(String(req.query.to ?? new Date(Date.now() + 7 * 86400000).toISOString()));
    const doctorId = String(req.params.id);

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        schedules: true,
        leaves: { where: { startsAt: { lt: to }, endsAt: { gt: from } } },
        appointments: {
          where: { startsAt: { gte: from, lt: to }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
          select: { startsAt: true },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Doctor not found" } });
    }

    res.json({
      success: true,
      data: {
        duration: doctor.consultationDuration,
        schedules: doctor.schedules,
        leaves: doctor.leaves,
        booked: doctor.appointments.map((a) => a.startsAt),
      },
    });
  })
);

// --- POST / (admin create doctor) ---

router.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        departmentId: z.string(),
        qualification: z.string().max(150).optional(),
        specialization: z.string().max(100).optional(),
        consultationDuration: z.number().int().min(5).max(120).default(15),
        consultationFee: z.number().min(0).optional(),
        clinicId: z.string().optional(),
      })
      .parse(req.body);

    const departmentExists = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true },
    });
    if (!departmentExists) {
      throw new AppError(400, "Selected department does not exist", "DEPARTMENT_NOT_FOUND");
    }

    if (input.clinicId) {
      const clinicExists = await prisma.clinic.findUnique({
        where: { id: input.clinicId },
        select: { id: true },
      });
      if (!clinicExists) {
        throw new AppError(400, "Selected clinic does not exist", "CLINIC_NOT_FOUND");
      }
    }

    const { hashPassword } = await import("../../lib/auth");
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: Role.DOCTOR,
        doctor: {
          create: {
            qualification: input.qualification,
            specialization: input.specialization,
            consultationDuration: input.consultationDuration,
            consultationFee: input.consultationFee,
            clinicId: input.clinicId,
            departments: { create: { departmentId: input.departmentId } },
          },
        },
      },
      select: { id: true, name: true, email: true, role: true },
    });

    res.status(201).json({ success: true, data: user });
  })
);

// --- PUT /:id (admin edit doctor) ---

router.put(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        departmentId: z.string().optional(),
        qualification: z.string().max(150).nullable().optional(),
        specialization: z.string().max(100).nullable().optional(),
        consultationFee: z.number().min(0).nullable().optional(),
        consultationDuration: z.number().int().min(5).max(120).optional(),
        clinicId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const doctor = await prisma.doctor.findUnique({
      where: { id: String(req.params.id) },
      include: { user: true },
    });
    if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

    if (input.email && input.email.toLowerCase() !== doctor.user.email) {
      const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
      if (existing) throw new AppError(409, "A user with this email already exists", "EMAIL_IN_USE");
    }

    if (input.clinicId && input.clinicId !== null) {
      const clinicExists = await prisma.clinic.findUnique({
        where: { id: input.clinicId },
        select: { id: true },
      });
      if (!clinicExists) {
        throw new AppError(400, "Selected clinic does not exist", "CLINIC_NOT_FOUND");
      }
    }

    const doctorData: any = {};
    if (input.qualification !== undefined) doctorData.qualification = input.qualification;
    if (input.specialization !== undefined) doctorData.specialization = input.specialization;
    if (input.consultationDuration !== undefined) doctorData.consultationDuration = input.consultationDuration;
    if (input.consultationFee !== undefined) doctorData.consultationFee = input.consultationFee;
    if (input.clinicId !== undefined) doctorData.clinicId = input.clinicId;
    if (input.isActive !== undefined) doctorData.isActive = input.isActive;

    await prisma.$transaction(async (tx) => {
      if (input.name !== undefined || input.email !== undefined) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: {
            name: input.name ?? doctor.user.name,
            email: input.email?.toLowerCase() ?? doctor.user.email,
          },
        });
      }

      if (input.departmentId !== undefined && input.departmentId !== null) {
        const department = await tx.department.findUnique({ where: { id: input.departmentId } });
        if (!department) throw new AppError(400, "Selected department does not exist", "DEPARTMENT_NOT_FOUND");
        await tx.doctorDepartment.deleteMany({ where: { doctorId: doctor.id, departmentId: { not: input.departmentId } } });
        await tx.doctorDepartment.upsert({
          where: { doctorId_departmentId: { doctorId: doctor.id, departmentId: input.departmentId } },
          create: { doctorId: doctor.id, departmentId: input.departmentId },
          update: {},
        });
      }

      if (Object.keys(doctorData).length > 0) {
        await tx.doctor.update({ where: { id: doctor.id }, data: doctorData });
      }
    });

    const updated = await prisma.doctor.findUnique({
      where: { id: doctor.id },
      include: {
        user: true,
        clinic: true,
        departments: { include: { department: true } },
      },
    });

    res.json({ success: true, data: updated });
  })
);

// --- DELETE /:id (admin deactivate doctor) ---

router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const doctor = await prisma.doctor.findUnique({ where: { id: String(req.params.id) } });
    if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

    // Delete doctor profile and user account
    await prisma.user.delete({ where: { id: doctor.userId } });

    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
