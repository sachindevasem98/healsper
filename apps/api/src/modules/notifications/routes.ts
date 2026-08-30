import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";
import { paginationSchema, paginationParams, paginationMeta } from "../../lib/pagination";

const router = Router();
router.use(requireAuth);

// --- GET /mine ---

router.get(
  "/mine",
  asyncHandler(async (req: any, res) => {
    const pagination = paginationSchema.parse({ page: req.query.page, limit: req.query.limit });
    const unreadOnly = req.query.unread === "true";

    const where: any = { userId: req.user.id };
    if (unreadOnly) where.readAt = null;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationParams(pagination),
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ success: true, data: notifications, pagination: paginationMeta(total, pagination) });
  })
);

// --- PATCH|PUT /:id/read ---

const markReadHandler = asyncHandler(async (req: any, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) throw new AppError(404, "Notification not found", "NOT_FOUND");
  if (notification.userId !== req.user.id) {
    throw new AppError(403, "You can only mark your own notifications as read", "FORBIDDEN");
  }

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { readAt: new Date() },
  });

  res.json({ success: true, data: updated });
});

router.patch("/:id/read", markReadHandler);
router.put("/:id/read", markReadHandler);

// --- POST|PUT /read-all ---

const markAllReadHandler = asyncHandler(async (req: any, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  res.json({ success: true, data: { message: "All notifications marked as read" } });
});

router.post("/read-all", markAllReadHandler);
router.put("/read-all", markAllReadHandler);

// --- DELETE /:id ---

router.delete(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) throw new AppError(404, "Notification not found", "NOT_FOUND");
    if (notification.userId !== req.user.id) {
      throw new AppError(403, "You can only delete your own notifications", "FORBIDDEN");
    }

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
