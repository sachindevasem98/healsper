import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";

const router = Router();

const timeRegex = /^\d{2}:\d{2}$/;
const scheduleFields = {
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "startTime must be HH:MM"),
  endTime: z.string().regex(timeRegex, "endTime must be HH:MM")
};
const scheduleSchema = z.object(scheduleFields).refine(s => s.startTime < s.endTime, { message: "startTime must be before endTime" });

async function resolveDoctorId(req: any, doctorId?: string) {
  if (req.user.role === Role.ADMIN) {
    if (!doctorId) throw new AppError(400, "doctorId is required for admin actions", "VALIDATION_ERROR");
    return doctorId;
  }
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
  if (!doctor) throw new AppError(404, "Doctor profile not found", "NOT_FOUND");
  if (doctorId && doctorId !== doctor.id) throw new AppError(403, "You can only manage your own schedule", "FORBIDDEN");
  return doctor.id;
}

router.get("/doctor/:doctorId", asyncHandler(async (req, res) => {
  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId: String(req.params.doctorId) },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
  });
  res.json({ success: true, data: schedules });
}));

router.post("/", requireAuth, requireRole(Role.DOCTOR, Role.ADMIN), asyncHandler(async (req: any, res) => {
  const input = z.object({ doctorId: z.string().optional() }).extend(scheduleFields).refine(s => s.startTime < s.endTime, { message: "startTime must be before endTime" }).parse(req.body);
  const doctorId = await resolveDoctorId(req, input.doctorId);
  const overlapping = await prisma.doctorSchedule.findFirst({ where: { doctorId, dayOfWeek: input.dayOfWeek, startTime: { lt: input.endTime }, endTime: { gt: input.startTime } } });
  if (overlapping) throw new AppError(409, "This schedule overlaps an existing one", "SCHEDULE_OVERLAP");
  const schedule = await prisma.doctorSchedule.create({ data: { doctorId, dayOfWeek: input.dayOfWeek, startTime: input.startTime, endTime: input.endTime } });
  res.status(201).json({ success: true, data: schedule });
}));

router.post("/bulk", requireAuth, requireRole(Role.DOCTOR, Role.ADMIN), asyncHandler(async (req: any, res) => {
  const input = z.object({ doctorId: z.string().optional(), schedules: z.array(scheduleSchema).min(1) }).parse(req.body);
  const doctorId = await resolveDoctorId(req, input.doctorId);
  const sorted = [...input.schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]; const cur = sorted[i];
    if (prev.dayOfWeek === cur.dayOfWeek && prev.endTime > cur.startTime) throw new AppError(409, "Submitted schedule times overlap", "SCHEDULE_OVERLAP");
  }
  await prisma.$transaction([
    prisma.doctorSchedule.deleteMany({ where: { doctorId } }),
    prisma.doctorSchedule.createMany({ data: input.schedules.map(s => ({ doctorId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) })
  ]);
  const schedules = await prisma.doctorSchedule.findMany({ where: { doctorId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] });
  res.json({ success: true, data: schedules });
}));

router.delete("/:id", requireAuth, requireRole(Role.DOCTOR, Role.ADMIN), asyncHandler(async (req: any, res) => {
  const id = String(req.params.id);
  const schedule = await prisma.doctorSchedule.findUnique({ where: { id } });
  if (!schedule) throw new AppError(404, "Schedule not found", "NOT_FOUND");
  if (req.user.role !== Role.ADMIN) {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor || schedule.doctorId !== doctor.id) throw new AppError(403, "You can only manage your own schedule", "FORBIDDEN");
  }
  await prisma.doctorSchedule.delete({ where: { id } });
  res.json({ success: true, data: { deleted: true } });
}));

export default router;
