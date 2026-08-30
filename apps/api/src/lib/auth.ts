import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { Role } from "@prisma/client";
import { config } from "../config";
import { AppError } from "./errors";

export type TokenUser = { id: string; role: Role; email: string };

export const hashPassword = (value: string) => argon2.hash(value);
export const verifyPassword = (hash: string, value: string) => argon2.verify(hash, value);

export const signToken = (user: TokenUser) =>
  jwt.sign(user, config.JWT_SECRET, { expiresIn: "1h" });

export const signRefreshToken = (user: TokenUser) =>
  jwt.sign({ id: user.id, role: user.role, email: user.email, type: "refresh" }, config.JWT_SECRET, { expiresIn: "7d" });

export const verifyRefreshToken = (token: string): TokenUser => {
  const payload = jwt.verify(token, config.JWT_SECRET) as TokenUser & { type?: string };
  if ((payload as any).type !== "refresh") throw new AppError(401, "Invalid refresh token", "UNAUTHORIZED");
  return { id: payload.id, role: payload.role, email: payload.email };
};

export function requireAuth(req: any, _res: any, next: any) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    req.user = jwt.verify(header.slice(7), config.JWT_SECRET) as TokenUser;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Invalid or expired token", "UNAUTHORIZED"));
  }
}

export const requireRole = (...roles: Role[]) => (req: any, _res: any, next: any) =>
  roles.includes(req.user?.role) ? next() : next(new AppError(403, "You do not have permission for this action", "FORBIDDEN"));
