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

    const where = q ? { name: { contains: q, mode: "insensitive" as const } } : undefined;

    const [clinics, total] = await Promise.all([
      prisma.clinic.findMany({
        where,
        include: { _count: { select: { doctors: true, departments: true } } },
        orderBy: { name: "asc" },
        ...paginationParams(pagination),
      }),
      prisma.clinic.count({ where }),
    ]);

    res.json({ success: true, data: clinics, pagination: paginationMeta(total, pagination) });
  })
);

// --- GET /:id ---

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const clinic = await prisma.clinic.findUnique({
      where: { id: String(req.params.id) },
      include: {
        departments: true,
        doctors: {
          include: {
            user: { select: { name: true } },
            departments: { include: { department: true } },
          },
        },
      },
    });
    if (!clinic) throw new AppError(404, "Clinic not found", "NOT_FOUND");
    res.json({ success: true, data: clinic });
  })
);

// --- POST / ---

router.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ name: z.string().min(2).max(150), address: z.string().max(300).optional() }).parse(req.body);
    const clinic = await prisma.clinic.create({ data: input });
    res.status(201).json({ success: true, data: clinic });
  })
);

// --- PATCH /:id ---

router.patch(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ name: z.string().min(2).max(150).optional(), address: z.string().max(300).optional() }).parse(req.body);
    const clinic = await prisma.clinic.update({ where: { id: String(req.params.id) }, data: input });
    res.json({ success: true, data: clinic });
  })
);

// --- DELETE /:id ---

router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const [doctorCount, departmentCount] = await Promise.all([
      prisma.doctor.count({ where: { clinicId: id } }),
      prisma.department.count({ where: { clinicId: id } }),
    ]);
    if (doctorCount > 0 || departmentCount > 0) {
      throw new AppError(409, "Cannot delete a clinic that has doctors or departments assigned", "CLINIC_IN_USE");
    }
    await prisma.clinic.delete({ where: { id } });
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
