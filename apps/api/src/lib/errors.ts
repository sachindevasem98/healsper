export class AppError extends Error { constructor(public status: number, message: string, public code = "APP_ERROR") { super(message); } }
import { NextFunction, Request, RequestHandler, Response } from "express";
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => any): RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
