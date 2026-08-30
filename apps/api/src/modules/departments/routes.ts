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

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: { clinic: true, _count: { select: { doctors: true } } },
        orderBy: { name: "asc" },
        ...paginationParams(pagination),
      }),
      prisma.department.count({ where }),
    ]);

    res.json({ success: true, data: departments, pagination: paginationMeta(total, pagination) });
  })
);

// --- GET /:id ---

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const department = await prisma.department.findUnique({
      where: { id: String(req.params.id) },
      include: {
        clinic: true,
        doctors: {
          include: { doctor: { include: { user: { select: { name: true } }, clinic: true } } },
        },
      },
    });
    if (!department) throw new AppError(404, "Department not found", "NOT_FOUND");
    res.json({ success: true, data: department });
  })
);

// --- POST / ---

router.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ name: z.string().min(2).max(100), clinicId: z.string().optional() }).parse(req.body);
    const department = await prisma.department.create({ data: { name: input.name, clinicId: input.clinicId } });
    res.status(201).json({ success: true, data: department });
  })
);

// --- PATCH /:id ---

router.patch(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ name: z.string().min(2).max(100).optional(), clinicId: z.string().optional() }).parse(req.body);
    const department = await prisma.department.update({ where: { id: String(req.params.id) }, data: input });
    res.json({ success: true, data: department });
  })
);

// --- PUT /:id ---

router.put(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const department = await prisma.department.findUnique({ where: { id: String(req.params.id) } });
    if (!department) throw new AppError(404, "Department not found", "NOT_FOUND");

    const input = z
      .object({ name: z.string().min(2).max(100).optional(), clinicId: z.string().nullable().optional() })
      .parse(req.body);

    const updated = await prisma.department.update({
      where: { id: department.id },
      data: { name: input.name, clinicId: input.clinicId ?? null },
    });
    res.json({ success: true, data: updated });
  })
);

// --- DELETE /:id ---

router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const doctorCount = await prisma.doctorDepartment.count({ where: { departmentId: id } });
    if (doctorCount > 0) {
      throw new AppError(409, "Cannot delete a department that has doctors assigned", "DEPARTMENT_IN_USE");
    }
    await prisma.department.delete({ where: { id } });
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
