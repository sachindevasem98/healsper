import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import {
  hashPassword,
  signToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyPassword,
  requireAuth,
} from "../../lib/auth";
import { AppError, asyncHandler } from "../../lib/errors";

const router = Router();

// --- Register (PATIENT only for self-registration) ---

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: Role.PATIENT,
        patient: { create: {} },
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const tokenUser = { id: user.id, email: user.email, role: user.role };
    res.status(201).json({
      success: true,
      data: {
        user,
        token: signToken(tokenUser),
        refreshToken: signRefreshToken(tokenUser),
      },
    });
  })
);

// --- Login ---

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const tokenUser = { id: user.id, email: user.email, role: user.role };
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token: signToken(tokenUser),
        refreshToken: signRefreshToken(tokenUser),
      },
    });
  })
);

// --- Refresh Token ---

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = z
      .object({ refreshToken: z.string() })
      .parse(req.body);

    const payload = verifyRefreshToken(refreshToken);
    const tokenUser = { id: payload.id, email: payload.email, role: payload.role };

    res.json({
      success: true,
      data: {
        token: signToken(tokenUser),
        refreshToken: signRefreshToken(tokenUser),
      },
    });
  })
);

// --- Logout (client-side token removal, no server-side blacklist needed) ---

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: { message: "Logged out successfully" } });
  })
);

// --- Change Password ---

router.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const input = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError(404, "User not found", "NOT_FOUND");

    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new AppError(401, "Current password is incorrect", "INVALID_CREDENTIALS");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    res.json({ success: true, data: { message: "Password updated successfully" } });
  })
);

export default router;
