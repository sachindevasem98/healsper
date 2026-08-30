import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/features/ProtectedRoute";
import AuthLayout from "./components/layouts/AuthLayout";
import DashboardLayout from "./components/layouts/DashboardLayout";
import PublicLayout from "./components/layouts/PublicLayout";

import HomePage from "./pages/Home";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import ChangePassword from "./pages/auth/ChangePassword";
import PatientDashboard from "./pages/patient/Dashboard";
import DoctorBrowse from "./pages/patient/DoctorBrowse";
import DoctorProfile from "./pages/patient/DoctorProfile";
import BookAppointment from "./pages/patient/BookAppointment";
import MyAppointments from "./pages/patient/MyAppointments";
import QueueStatus from "./pages/patient/QueueStatus";
import MyRecords from "./pages/patient/MyRecords";
import PatientProfile from "./pages/patient/Profile";
import DoctorDashboard from "./pages/doctor/Dashboard";
import DoctorAppointments from "./pages/doctor/Appointments";
import ScheduleManager from "./pages/doctor/Schedule";
import LeaveManager from "./pages/doctor/Leaves";
import DoctorQueue from "./pages/doctor/Queue";
import ConsultationForm from "./pages/doctor/Consultation";
import DoctorProfileEdit from "./pages/doctor/ProfileEdit";
import PatientHistory from "./pages/doctor/PatientHistory";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAppointments from "./pages/admin/Appointments";
import ClinicManager from "./pages/admin/Clinics";
import DepartmentManager from "./pages/admin/Departments";
import DoctorManager from "./pages/admin/Doctors";
import PatientManager from "./pages/admin/Patients";
import AuditLogs from "./pages/admin/AuditLogs";

import "./index.css";

function BrowseLayout() {
  const { user } = useAuth();
  return user ? <DashboardLayout /> : <PublicLayout />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public / adaptive browsing routes */}
            <Route element={<BrowseLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/doctors" element={<DoctorBrowse />} />
              <Route path="/doctors/:id" element={<DoctorProfile />} />
            </Route>

            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Any authenticated user routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/change-password" element={<ChangePassword />} />
              </Route>
            </Route>

            {/* Patient routes */}
            <Route element={<ProtectedRoute role="PATIENT" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<PatientDashboard />} />
                <Route path="/doctors/:id/book" element={<BookAppointment />} />
                <Route path="/appointments" element={<MyAppointments />} />
                <Route path="/queue" element={<QueueStatus />} />
                <Route path="/records" element={<MyRecords />} />
                <Route path="/profile" element={<PatientProfile />} />
              </Route>
            </Route>

            {/* Doctor routes */}
            <Route element={<ProtectedRoute role="DOCTOR" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/doctor/appointments" element={<DoctorAppointments />} />
                <Route path="/doctor/schedule" element={<ScheduleManager />} />
                <Route path="/doctor/leaves" element={<LeaveManager />} />
                <Route path="/doctor/queue" element={<DoctorQueue />} />
                <Route path="/doctor/consultation/:appointmentId" element={<ConsultationForm />} />
                <Route path="/doctor/patient/:patientId" element={<PatientHistory />} />
                <Route path="/doctor/profile" element={<DoctorProfileEdit />} />
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute role="ADMIN" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/appointments" element={<AdminAppointments />} />
                <Route path="/admin/clinics" element={<ClinicManager />} />
                <Route path="/admin/departments" element={<DepartmentManager />} />
                <Route path="/admin/doctors" element={<DoctorManager />} />
                <Route path="/admin/patients" element={<PatientManager />} />
                <Route path="/admin/audit" element={<AuditLogs />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
