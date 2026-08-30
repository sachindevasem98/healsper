export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export type Patient = {
  id: string;
  userId: string;
  user: User;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
};

export type Doctor = {
  id: string;
  userId: string;
  user: User;
  qualification?: string;
  specialization?: string;
  consultationDuration: number;
  consultationFee?: number;
  clinicId?: string;
  clinic?: Clinic;
  isActive?: boolean;
  departments?: DoctorDepartment[];
  schedules?: DoctorSchedule[];
  leaves?: DoctorLeave[];
};

export type DoctorDepartment = {
  doctorId: string;
  departmentId: string;
  department: Department;
};

export type DoctorSchedule = {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type DoctorLeave = {
  id: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
};

export type Clinic = {
  id: string;
  name: string;
  address?: string;
  _count?: { doctors: number; departments: number };
};

export type Department = {
  id: string;
  name: string;
  clinicId?: string;
  clinic?: Clinic;
  _count?: { doctors: number };
};

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason?: string;
  statusReason?: string;
  deletedAt?: string;
  createdAt: string;
  patient?: Patient;
  doctor?: Doctor;
  queueEntry?: QueueEntry;
  consultation?: Consultation;
};

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "WAITING"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

export type QueueEntry = {
  id: string;
  appointmentId: string;
  patientId: string;
  token: number;
  status: QueueStatus;
  checkedInAt: string;
  calledAt?: string;
  servedAt?: string;
  patient?: Patient;
  appointment?: Appointment;
};

export type QueueStatus = "WAITING" | "CALLED" | "SERVED" | "SKIPPED";

export type Consultation = {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  notes?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  createdAt: string;
  doctor?: Doctor;
  prescription?: Prescription;
};

export type Prescription = {
  id: string;
  consultationId: string;
  patientId: string;
  diagnosis?: string;
  advice?: string;
  createdAt: string;
  items: PrescriptionItem[];
  consultation?: Consultation;
};

export type PrescriptionItem = {
  id: string;
  prescriptionId: string;
  medicine: string;
  dosage: string;
  frequency: string;
  timing?: string;
  duration?: string;
};

export type FollowUp = {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  scheduledFor: string;
  reason?: string;
  doctor?: Doctor;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  user?: { id: string; name: string; email: string };
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: Pagination;
};
