import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { config } from "../config";

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string; role: string };
      (socket.data as any).userId = payload.userId;
      (socket.data as any).role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data as any;

    if (role === "DOCTOR") {
      socket.join(`doctor:${userId}`);
    } else if (role === "PATIENT") {
      socket.join(`patient:${userId}`);
    } else if (role === "ADMIN") {
      socket.join("admins");
    }

    socket.on("join:doctor-room", (doctorId: string) => {
      socket.join(`doctor:${doctorId}`);
    });

    socket.on("join:patient-room", (patientId: string) => {
      socket.join(`patient:${patientId}`);
    });

    socket.on("join:queue-room", (doctorId: string) => {
      socket.join(`queue:${doctorId}`);
    });
  });
}

export function emitToDoctor(io: Server, doctorId: string, event: string, data: any) {
  io.to(`doctor:${doctorId}`).emit(event, data);
}

export function emitToPatient(io: Server, patientId: string, event: string, data: any) {
  io.to(`patient:${patientId}`).emit(event, data);
}

export function emitToQueue(io: Server, doctorId: string, event: string, data: any) {
  io.to(`queue:${doctorId}`).emit(event, data);
}

export function emitToAdmins(io: Server, event: string, data: any) {
  io.to("admins").emit(event, data);
}
