import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../features/NotificationBell";
import type { Role } from "../../lib/types";

const patientLinks = [
  { to: "/dashboard", label: "Overview", icon: "space_dashboard" },
  { to: "/doctors", label: "Doctors", icon: "stethoscope" },
  { to: "/appointments", label: "Appointments", icon: "calendar_month" },
  { to: "/queue", label: "Queue", icon: "format_list_numbered" },
  { to: "/records", label: "Records", icon: "folder_open" },
  { to: "/profile", label: "Profile", icon: "person" },
];

const doctorLinks = [
  { to: "/doctor", label: "Overview", icon: "space_dashboard" },
  { to: "/doctor/appointments", label: "Appointments", icon: "calendar_month" },
  { to: "/doctor/schedule", label: "Schedule", icon: "event_note" },
  { to: "/doctor/leaves", label: "Leaves", icon: "event_busy" },
  { to: "/doctor/queue", label: "Queue", icon: "format_list_numbered" },
  { to: "/doctor/profile", label: "Profile", icon: "person" },
];

const adminLinks = [
  { to: "/admin", label: "Overview", icon: "space_dashboard" },
  { to: "/admin/appointments", label: "Appointments", icon: "calendar_month" },
  { to: "/admin/clinics", label: "Clinics", icon: "local_hospital" },
  { to: "/admin/departments", label: "Departments", icon: "category" },
  { to: "/admin/doctors", label: "Doctors", icon: "stethoscope" },
  { to: "/admin/patients", label: "Patients", icon: "group" },
  { to: "/admin/audit", label: "Audit Logs", icon: "history" },
];

const linksByRole: Record<Role, typeof patientLinks> = {
  PATIENT: patientLinks,
  DOCTOR: doctorLinks,
  ADMIN: adminLinks,
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  const links = linksByRole[user.role];
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavClick = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      <div className="mb-8 flex items-center justify-between">
        <Link
          to={links[0].to}
          onClick={handleNavClick}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src="/helsper.png" alt="Healsper" className="w-10 h-10 object-contain rounded-lg shrink-0" />
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">Healsper</h1>
            <p className="text-xs text-on-surface-variant -mt-0.5">Healthcare portal</p>
          </div>
        </Link>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/dashboard" || link.to === "/doctor" || link.to === "/admin"}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary text-on-primary font-medium shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-outline-variant/30 pt-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-sm font-semibold text-on-primary shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{user.name}</p>
            <p className="text-xs text-on-surface-variant">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-left text-xs text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-on-primary p-2 rounded-lg shadow-lg"
        aria-label="Menu"
      >
        <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-primary/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 w-64 bg-surface-container-lowest text-on-surface min-h-screen flex flex-col p-5 z-40 transform transition-transform duration-200 lg:hidden border-r border-outline-variant/30 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-surface-container-lowest text-on-surface min-h-screen flex-col p-5 shrink-0 sticky top-0 h-screen border-r border-outline-variant/20">
        {sidebarContent}
      </aside>
    </>
  );
}