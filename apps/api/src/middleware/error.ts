import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
export function errorHandler(error: any, req: any, res: any, _next: any) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return res.status(409).json({ success: false, error: { code: "CONFLICT", message: "That resource is already in use." } });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "The requested record was not found." } });
  }
  const status = error instanceof AppError ? error.status : 500;
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.path} -> ${status}: ${error?.message ?? error}`);
  }
  res.status(status).json({ success: false, error: { code: error.code ?? "INTERNAL_ERROR", message: status === 500 ? "An unexpected error occurred." : error.message } });
}
