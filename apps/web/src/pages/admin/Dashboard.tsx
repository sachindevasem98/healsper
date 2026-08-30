import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useSocket } from "../../lib/socket";
import Spinner from "../../components/ui/Spinner";

type AdminAnalytics = {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  waiting: number;
  activeDoctors: number;
  patientsCheckedIn: number;
  avgWaitMinutes: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected, on } = useSocket();

  const fetchStats = useCallback(() => {
    api.getAnalytics().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!connected) return;
    fetchStats();
    return on("overview:changed", fetchStats);
  }, [connected, on, fetchStats]);

  if (loading) return <Spinner />;
  if (!stats) return <div className="text-center py-12 text-on-surface-variant">Failed to load analytics</div>;

  const cards = [
    { label: "Today's Appointments", value: stats.totalAppointments, color: "text-on-surface" },
    { label: "Completed", value: stats.completed, color: "text-green-600" },
    { label: "Cancelled", value: stats.cancelled, color: "text-error" },
    { label: "No-shows", value: stats.noShow, color: "text-warning-text" },
    { label: "Currently Waiting", value: stats.waiting, color: "text-blue-600" },
    { label: "Active Doctors", value: stats.activeDoctors, color: "text-primary" },
    { label: "Patients Checked In", value: stats.patientsCheckedIn, color: "text-indigo-600" },
    { label: "Avg Wait Time", value: `${stats.avgWaitMinutes}m`, color: "text-on-surface" },
  ];

  const tiles = [
    { to: "/admin/clinics", icon: "local_hospital", title: "Manage Clinics", desc: "Add, edit, or remove clinics" },
    { to: "/admin/departments", icon: "category", title: "Manage Departments", desc: "Organize medical departments" },
    { to: "/admin/doctors", icon: "stethoscope", title: "Manage Doctors", desc: "Add or manage doctor accounts" },
    { to: "/admin/appointments", icon: "calendar_month", title: "Manage Appointments", desc: "View and update appointment statuses" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-body-sm font-body-sm text-on-surface-variant">Admin Panel</p>
        <h1 className="font-headline-md text-headline-md text-primary">Today's Overview</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 text-center">
            <p className="text-xs text-on-surface-variant">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color} mt-1`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm hover:shadow-md hover:border-tertiary-container transition-all"
          >
            <span className="material-symbols-outlined text-3xl text-primary mb-2 block">{t.icon}</span>
            <h3 className="font-medium text-on-surface">{t.title}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}