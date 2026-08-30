import type {
  ApiResponse,
  Appointment,
  AuditLog,
  Clinic,
  Consultation,
  Department,
  Doctor,
  DoctorLeave,
  DoctorSchedule,
  FollowUp,
  Notification,
  Patient,
  Prescription,
  QueueEntry,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
  }
}

type AuthTokens = { token: string; refreshToken: string };

let refreshing: Promise<AuthTokens> | null = null;

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function refreshAccessToken(): Promise<AuthTokens> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new ApiError(401, "No refresh token", "NO_REFRESH_TOKEN");
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message || "Session expired", body?.error?.code || "REFRESH_FAILED");
  }
  return body.data;
}

function onSessionExpired() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:expired"));
}

async function requestCore<T>(path: string, options: RequestInit = {}, full = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (res.status === 401 && token && localStorage.getItem("refreshToken")) {
    try {
        if (!refreshing) {
          refreshing = refreshAccessToken()
            .then((data) => {
              localStorage.setItem("token", data.token);
              localStorage.setItem("refreshToken", data.refreshToken);
              return data;
            })
            .finally(() => { refreshing = null; });
        }
        await refreshing;

        const retry = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...options.headers,
          },
        });
        const retryBody = await retry.json().catch(() => null);
        if (!retry.ok) {
          if (retry.status === 401) throw new ApiError(401, "Session expired", "SESSION_EXPIRED");
          throw new ApiError(retry.status, retryBody?.error?.message || `Request failed: ${retry.status}`, retryBody?.error?.code || "API_ERROR");
        }
        return full ? retryBody : retryBody.data;
      } catch (err: any) {
        if (err?.status === 401) {
          onSessionExpired();
          throw new ApiError(401, "Your session has expired. Please sign in again.", "SESSION_EXPIRED");
        }
        throw err;
      }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message || `Request failed: ${res.status}`, body?.error?.code || "API_ERROR");
  }

  return full ? body : body.data;
}

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestCore<T>(path, options, false);
}

function requestFull<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestCore<T>(path, options, true);
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request<{ user: any; token: string; refreshToken: string }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  register: (data: { name: string; email: string; password: string }) =>
    request<{ user: any; token: string; refreshToken: string }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  logout: () => request("/auth/logout", { method: "POST" }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request("/auth/password", { method: "PATCH", body: JSON.stringify(data) }),

  // Doctors
  getDoctors: (q?: string, page?: number, limit?: number) =>
    request<Doctor[]>(`/doctors${qs({ q, page, limit })}`),

  getDoctorsPage: (q?: string, page?: number, limit?: number) =>
    requestFull<ApiResponse<Doctor[]>>(`/doctors${qs({ q, page, limit })}`),

  getDoctor: (id: string) => request<Doctor>(`/doctors/${id}`),

  getDoctorAvailability: (id: string, from?: string, to?: string) =>
    request<{ schedules: DoctorSchedule[]; duration: number; booked: string[] }>(`/doctors/${id}/availability${qs({ from, to })}`),

  getDoctorProfile: () => request<Doctor>("/doctors/me"),

  updateDoctorProfile: (data: any) =>
    request<Doctor>("/doctors/me", { method: "PATCH", body: JSON.stringify(data) }),

  // Appointments
  getMyAppointments: (params?: {
    date?: "today" | "all";
    tz?: string;
    range?: "upcoming" | "past";
    status?: string;
    from?: string;
    to?: string;
  }) => request<Appointment[]>(`/appointments/mine${qs(params || {})}`),

  getDoctorAppointments: (params?: {
    range?: "upcoming" | "past";
    status?: string;
    tz?: string;
    from?: string;
    to?: string;
  }) => request<Appointment[]>(`/appointments/doctor${qs(params || {})}`),

  bookAppointment: (data: { doctorId: string; startsAt: string; reason?: string }) =>
    request<Appointment>("/appointments", { method: "POST", body: JSON.stringify(data) }),

  updateAppointmentStatus: (id: string, status: string) =>
    request<any>(`/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  cancelAppointment: (id: string, reason?: string) =>
    request<Appointment>(`/appointments/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),

  rescheduleAppointment: (id: string, startsAt: string, reason?: string) =>
    request<Appointment>(`/appointments/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ startsAt, reason }),
    }),

  deleteAppointment: (id: string) => request<Appointment>(`/appointments/${id}`, { method: "DELETE" }),

  checkIn: (id: string) =>
    request<QueueEntry>(`/appointments/${id}/check-in`, { method: "POST" }),

  // Queue
  getQueue: (doctorId: string) => request<QueueEntry[]>(`/queue/today/${doctorId}`),

  getMyQueueStatus: () =>
    request<{ queueEntry: QueueEntry | null; waitInfo: { patientsAhead: number; estimatedMinutes: number } | null }>("/patients/mine/queue"),

  callPatient: (id: string) => request<any>(`/queue/${id}/call`, { method: "POST" }),

  skipPatient: (id: string) => request<any>(`/queue/${id}/skip`, { method: "POST" }),

  servePatient: (id: string) => request<any>(`/queue/${id}/serve`, { method: "POST" }),

  // Consultations
  createConsultation: (data: any) =>
    request<any>("/consultations", { method: "POST", body: JSON.stringify(data) }),

  getPatientConsultations: (patientId: string, page?: number, limit?: number) =>
    request<Consultation[]>(`/consultations/patient/${patientId}${qs({ page, limit })}`),

  createFollowUp: (consultationId: string, data: { scheduledFor: string; reason?: string }) =>
    request<any>(`/consultations/${consultationId}/follow-up`, { method: "POST", body: JSON.stringify(data) }),

  // Departments
  getDepartments: (q?: string, page?: number, limit?: number) =>
    request<Department[]>(`/departments${qs({ q, page, limit })}`),

  createDepartment: (data: { name: string; clinicId?: string }) =>
    request<any>("/departments", { method: "POST", body: JSON.stringify(data) }),

  updateDepartment: (id: string, data: { name?: string; clinicId?: string }) =>
    request<Department>(`/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteDepartment: (id: string) =>
    request<any>(`/departments/${id}`, { method: "DELETE" }),

  // Clinics
  getClinics: (q?: string, page?: number, limit?: number) =>
    request<Clinic[]>(`/clinics${qs({ q, page, limit })}`),

  createClinic: (data: { name: string; address?: string }) =>
    request<any>("/clinics", { method: "POST", body: JSON.stringify(data) }),

  deleteClinic: (id: string) =>
    request<any>(`/clinics/${id}`, { method: "DELETE" }),

  // Schedules
  getSchedules: (doctorId: string) => request<DoctorSchedule[]>(`/schedules/doctor/${doctorId}`),

  bulkSchedules: (data: { doctorId?: string; schedules: any[] }) =>
    request<DoctorSchedule[]>("/schedules/bulk", { method: "POST", body: JSON.stringify(data) }),

  deleteSchedule: (id: string) =>
    request<any>(`/schedules/${id}`, { method: "DELETE" }),

  // Leaves
  getMyLeaves: () => request<DoctorLeave[]>("/leaves/mine"),

  createLeave: (data: any) =>
    request<any>("/leaves", { method: "POST", body: JSON.stringify(data) }),

  deleteLeave: (id: string) =>
    request<any>(`/leaves/${id}`, { method: "DELETE" }),

  // Patients
  getMyProfile: () => request<Patient>("/patients/mine"),

  updateMyProfile: (data: any) =>
    request<Patient>("/patients/mine", { method: "PATCH", body: JSON.stringify(data) }),

  getMyConsultations: (page?: number, limit?: number) =>
    request<Consultation[]>(`/patients/mine/consultations${qs({ page, limit })}`),

  getMyPrescriptions: (page?: number, limit?: number) =>
    request<Prescription[]>(`/patients/mine/prescriptions${qs({ page, limit })}`),

  getMyFollowUps: () => request<FollowUp[]>("/patients/mine/follow-ups"),

  getPatient: (id: string) => request<Patient>(`/patients/${id}`),

  getPatients: (q?: string, page?: number, limit?: number) =>
    request<Patient[]>(`/patients${qs({ q, page, limit })}`),

  // Notifications
  getMyNotifications: (page?: number, limit?: number, unread?: boolean) =>
    request<Notification[]>(`/notifications/mine${qs({ page, limit, unread: unread ? "true" : undefined })}`),

  markNotificationRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, { method: "PUT" }),

  markAllNotificationsRead: () =>
    request("/notifications/read-all", { method: "PUT" }),

  // Admin
  getAnalytics: () => {
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    return request<any>(`/admin/overview${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`);
  },

  getAuditLogsPage: (page?: number, limit?: number, entity?: string) =>
    requestFull<ApiResponse<AuditLog[]>>(`/admin/audit-logs${qs({ page, limit, entity })}`),

  createDoctor: (data: any) =>
    request<any>("/doctors", { method: "POST", body: JSON.stringify(data) }),

  updateDoctor: (id: string, data: any) =>
    request<Doctor>(`/doctors/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteDoctor: (id: string) =>
    request<any>(`/doctors/${id}`, { method: "DELETE" }),
};
