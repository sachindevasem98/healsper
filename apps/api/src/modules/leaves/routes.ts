import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";

const router = Router();

function parseRange(req: any) {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  return { startsAt: to ? { lt: to } : undefined, endsAt: from ? { gt: from } : undefined };
}

async function resolveDoctorId(req: any, doctorId?: string) {
  if (req.user.role === Role.ADMIN) {
    if (!doctorId) throw new AppError(400, "doctorId is required for admin actions", "VALIDATION_ERROR");
    return doctorId;
  }
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
  if (!doctor) throw new AppError(404, "Doctor profile not found", "NOT_FOUND");
  if (doctorId && doctorId !== doctor.id) throw new AppError(403, "You can only manage your own leave", "FORBIDDEN");
  return doctor.id;
}

router.get("/doctor/:doctorId", asyncHandler(async (req, res) => {
  const leaves = await prisma.doctorLeave.findMany({ where: { doctorId: String(req.params.doctorId), ...parseRange(req) }, orderBy: { startsAt: "asc" } });
  res.json({ success: true, data: leaves });
}));

router.get("/mine", requireAuth, requireRole(Role.DOCTOR), asyncHandler(async (req: any, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
  if (!doctor) throw new AppError(404, "Doctor profile not found", "NOT_FOUND");
  const leaves = await prisma.doctorLeave.findMany({ where: { doctorId: doctor.id, ...parseRange(req) }, orderBy: { startsAt: "asc" } });
  res.json({ success: true, data: leaves });
}));

router.post("/", requireAuth, requireRole(Role.DOCTOR, Role.ADMIN), asyncHandler(async (req: any, res) => {
  const input = z.object({ doctorId: z.string().optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), reason: z.string().max(300).optional() }).refine(l => l.startsAt < l.endsAt, { message: "startsAt must be before endsAt" }).parse(req.body);
  const doctorId = await resolveDoctorId(req, input.doctorId);
  const overlapping = await prisma.doctorLeave.findFirst({ where: { doctorId, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } } });
  if (overlapping) throw new AppError(409, "This leave overlaps an existing one", "LEAVE_OVERLAP");
  const leave = await prisma.doctorLeave.create({ data: { doctorId, startsAt: input.startsAt, endsAt: input.endsAt, reason: input.reason } });
  res.status(201).json({ success: true, data: leave });
}));

router.delete("/:id", requireAuth, requireRole(Role.DOCTOR, Role.ADMIN), asyncHandler(async (req: any, res) => {
  const id = String(req.params.id);
  const leave = await prisma.doctorLeave.findUnique({ where: { id } });
  if (!leave) throw new AppError(404, "Leave not found", "NOT_FOUND");
  if (req.user.role !== Role.ADMIN) {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor || leave.doctorId !== doctor.id) throw new AppError(403, "You can only manage your own leave", "FORBIDDEN");
  }
  await prisma.doctorLeave.delete({ where: { id } });
  res.json({ success: true, data: { deleted: true } });
}));

export default router;
