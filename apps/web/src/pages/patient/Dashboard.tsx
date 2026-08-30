import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { Appointment } from "../../lib/types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";

const quickTiles = [
  { to: "/doctors", icon: "stethoscope", title: "Find a Doctor", desc: "Browse specialists and book" },
  { to: "/appointments", icon: "calendar_month", title: "My Appointments", desc: "View and manage bookings" },
  { to: "/queue", icon: "format_list_numbered", title: "Queue", desc: "Live token status" },
  { to: "/records", icon: "folder_open", title: "My Records", desc: "Prescriptions and history" },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyAppointments().then(setAppointments).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const upcoming = appointments
    .filter((a) => ["PENDING", "CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"].includes(a.status))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-body-sm font-body-sm text-on-surface-variant">Welcome back,</p>
        <h1 className="font-headline-md text-headline-md text-primary">{user?.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Upcoming Appointments</h2>
        {loading ? (
          <Spinner />
        ) : upcoming.length === 0 ? (
          <EmptyState title="No upcoming appointments" description="Book a doctor to get started" action={<Button onClick={() => navigate("/doctors")} size="sm">Find a doctor</Button>} />
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => (
              <div key={apt.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary-container flex flex-col items-center justify-center shrink-0">
                  <strong className="text-lg text-on-primary">{new Date(apt.startsAt).getDate()}</strong>
                  <small className="text-xs text-on-primary-container">{new Date(apt.startsAt).toLocaleDateString(undefined, { month: "short" })}</small>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-on-surface truncate">Dr. {apt.doctor?.user?.name}</h3>
                  <p className="text-sm text-on-surface-variant">
                    {new Date(apt.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {apt.queueEntry?.token ? ` · Token #${apt.queueEntry.token}` : ""}
                  </p>
                </div>
                <Badge status={apt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}