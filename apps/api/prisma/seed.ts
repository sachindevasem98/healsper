import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

const WEEKDAYS = [1, 2, 3, 4, 5];

const clinics = [
  { name: "CareFlow Main Clinic", address: "12 Wellness Avenue, Springfield" },
  { name: "CareFlow City Branch", address: "88 Market Street, Riverside" },
];

const departments = [
  { name: "Cardiology", clinicName: "CareFlow Main Clinic" },
  { name: "Neurology", clinicName: "CareFlow Main Clinic" },
  { name: "General Medicine", clinicName: "CareFlow Main Clinic" },
  { name: "Pediatrics", clinicName: "CareFlow City Branch" },
  { name: "Dermatology", clinicName: "CareFlow City Branch" },
];

const doctors = [
  {
    name: "Dr. Sarah Mitchell",
    email: "doctor.mitchell@careflow.com",
    password: "doctor123",
    qualification: "MD, DNB Cardiology",
    specialization: "Cardiology",
    consultationDuration: 15,
    consultationFee: 80,
    clinicName: "CareFlow Main Clinic",
    departmentName: "Cardiology",
  },
  {
    name: "Dr. Rohan Gupta",
    email: "doctor.gupta@careflow.com",
    password: "doctor123",
    qualification: "MBBS, DM Neurology",
    specialization: "Neurology",
    consultationDuration: 20,
    consultationFee: 100,
    clinicName: "CareFlow Main Clinic",
    departmentName: "Neurology",
  },
  {
    name: "Dr. Elena Rodriguez",
    email: "doctor.rodriguez@careflow.com",
    password: "doctor123",
    qualification: "MD Pediatrics",
    specialization: "Pediatrics",
    consultationDuration: 15,
    consultationFee: 60,
    clinicName: "CareFlow City Branch",
    departmentName: "Pediatrics",
  },
];

const scheduleBlocks: Array<{ startTime: string; endTime: string }> = [
  { startTime: "09:00", endTime: "13:00" },
  { startTime: "14:00", endTime: "17:00" },
];

function nextWeekdays(count: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (dates.length < count) {
    if (WEEKDAYS.includes(cursor.getDay())) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function main() {
  console.log("Seeding database...");

  const adminPassword = await hashPassword("admin123");
  const patientPassword = await hashPassword("patient123");
  const doctorPassword = await hashPassword("doctor123");

  await prisma.user.upsert({
    where: { email: "admin@careflow.com" },
    update: {},
    create: {
      email: "admin@careflow.com",
      passwordHash: adminPassword,
      name: "CareFlow Admin",
      role: Role.ADMIN,
    },
  });
  console.log("  admin user ready");

  const patientUser = await prisma.user.upsert({
    where: { email: "patient@careflow.com" },
    update: {},
    create: {
      email: "patient@careflow.com",
      passwordHash: patientPassword,
      name: "Alex Johnson",
      role: Role.PATIENT,
      patient: {
        create: {
          dateOfBirth: new Date("1992-05-12"),
          gender: "Male",
          phone: "+1 555-0100",
          address: "45 Maple Lane, Springfield",
          emergencyContact: "+1 555-0199",
        },
      },
    },
  });
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { userId: patientUser.id },
  });
  console.log("  test patient ready");

  const clinicRecords = new Map<string, string>();
  for (const clinic of clinics) {
    const existing = await prisma.clinic.findFirst({ where: { name: clinic.name } });
    const record = existing ?? (await prisma.clinic.create({ data: clinic }));
    clinicRecords.set(clinic.name, record.id);
  }
  console.log("  clinics ready");

  const departmentRecords = new Map<string, string>();
  for (const dept of departments) {
    const record = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: {
        name: dept.name,
        clinicId: clinicRecords.get(dept.clinicName),
      },
    });
    departmentRecords.set(dept.name, record.id);
  }
  console.log("  departments ready");

  const doctorRecords: Array<{ id: string; clinicId: string; departmentId: string; consultationDuration: number }> = [];
  for (const doc of doctors) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: {
        email: doc.email,
        passwordHash: doctorPassword,
        name: doc.name,
        role: Role.DOCTOR,
      },
    });
    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        qualification: doc.qualification,
        specialization: doc.specialization,
        consultationDuration: doc.consultationDuration,
        consultationFee: doc.consultationFee,
        clinicId: clinicRecords.get(doc.clinicName),
      },
    });

    const clinicId = clinicRecords.get(doc.clinicName)!;
    const departmentId = departmentRecords.get(doc.departmentName)!;

    await prisma.doctorDepartment.upsert({
      where: { doctorId_departmentId: { doctorId: doctor.id, departmentId } },
      update: {},
      create: { doctorId: doctor.id, departmentId },
    });

    await prisma.doctorSchedule.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.doctorSchedule.createMany({
      data: WEEKDAYS.flatMap((dayOfWeek) =>
        scheduleBlocks.map((block) => ({
          doctorId: doctor.id,
          dayOfWeek,
          startTime: block.startTime,
          endTime: block.endTime,
        }))
      ),
    });

    doctorRecords.push({
      id: doctor.id,
      clinicId,
      departmentId,
      consultationDuration: doc.consultationDuration,
    });
  }
  console.log("  doctors + schedules ready");

  await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
  const days = nextWeekdays(3);
  await prisma.appointment.createMany({
    data: doctorRecords.map((doctor, index) => {
      const startsAt = days[index];
      startsAt.setHours(9 + index, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + doctor.consultationDuration * 60000);
      return {
        patientId: patient.id,
        doctorId: doctor.id,
        startsAt,
        endsAt,
        status: "PENDING",
        reason: ["Routine check-up", "Follow-up consultation", "Consultation"][index],
      };
    }),
  });
  console.log("  sample appointments ready");

  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());