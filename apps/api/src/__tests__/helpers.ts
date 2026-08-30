import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

export async function createTestUser(role: "PATIENT" | "DOCTOR" | "ADMIN", overrides: Record<string, any> = {}) {
  const email = overrides.email || `${role.toLowerCase()}-${Date.now()}@test.com`;
  const password = overrides.password || "testpass123";
  const hashedPassword = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      name: overrides.name || `Test ${role}`,
      email,
      passwordHash: hashedPassword,
      role,
    },
  });

  let profile = null;
  if (role === "PATIENT") {
    profile = await prisma.patient.create({
      data: { userId: user.id, gender: "MALE" },
    });
  } else if (role === "DOCTOR") {
    profile = await prisma.doctor.create({
      data: { userId: user.id, qualification: "MD", specialization: "General" },
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  return { user, profile, token, password };
}

export async function createTestClinic(name?: string) {
  return prisma.clinic.create({
    data: { name: name || `Clinic-${Date.now()}` },
  });
}

export async function createTestSchedule(doctorId: string, dayOfWeek: number = 1) {
  return prisma.doctorSchedule.create({
    data: {
      doctorId,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
    },
  });
}

export { prisma };
