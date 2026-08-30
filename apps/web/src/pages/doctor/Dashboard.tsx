import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { Appointment } from "../../lib/types";
import { localDayKey, isSameLocalDay } from "../../lib/dates";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

const quickTiles = [
  { to: "/doctor/queue", icon: "format_list_numbered", title: "Patient Queue", desc: "Manage today's queue" },
  { to: "/doctor/schedule", icon: "calendar_month", title: "Schedule", desc: "Manage your weekly hours" },
  { to: "/doctor/leaves", icon: "event_busy", title: "Leaves", desc: "Manage time off" },
];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyAppointments().then(setAppointments).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const today = localDayKey(new Date());
  const todayAppts = appointments.filter((a) => isSameLocalDay(a.startsAt, today));
  const completed = todayAppts.filter((a) => a.status === "COMPLETED").length;
  const waiting = todayAppts.filter((a) => ["WAITING", "CHECKED_IN"].includes(a.status)).length;

  const stats = [
    { label: "Today's Appointments", value: todayAppts.length, color: "text-primary" },
    { label: "Completed", value: completed, color: "text-green-600" },
    { label: "Waiting", value: waiting, color: "text-warning-text" },
    { label: "Total", value: appointments.length, color: "text-on-surface" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-body-sm font-body-sm text-on-surface-variant">Welcome back,</p>
        <h1 className="font-headline-md text-headline-md text-primary">Dr. {user?.name}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 text-center">
            <p className="text-sm text-on-surface-variant">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickTiles.map((t) => (
          <button
            key={t.to}
            onClick={() => navigate(t.to)}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 text-left shadow-sm hover:shadow-md hover:border-tertiary-container transition-all"
          >
            <span className="material-symbols-outlined text-3xl text-primary mb-2 block">{t.icon}</span>
            <h3 className="font-medium text-on-surface">{t.title}</h3>
            <p className="text-xs text-on-surface-variant mt-1">{t.desc}</p>
          </button>
        ))}
      </div>

      {todayAppts.length > 0 && (
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Today's Appointments</h2>
          <div className="space-y-2">
            {todayAppts.slice(0, 5).map((apt) => (
              <div key={apt.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-3 flex items-center gap-3">
                <span className="text-sm font-mono text-on-surface-variant w-16">{new Date(apt.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                <span className="flex-1 text-sm font-medium text-on-surface">{apt.patient?.user?.name}</span>
                <Badge status={apt.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}