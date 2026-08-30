import { Request, Response, NextFunction } from "express";

function stripHtml(value: any): any {
  if (typeof value === "string") {
    return value.replace(/<[^>]*>/g, "");
  }
  if (Array.isArray(value)) {
    return value.map(stripHtml);
  }
  if (value && typeof value === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      cleaned[key] = stripHtml(val);
    }
    return cleaned;
  }
  return value;
}

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = stripHtml(req.body);
  }
  next();
}
