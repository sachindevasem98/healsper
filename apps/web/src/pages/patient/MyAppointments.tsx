import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Appointment, QueueEntry } from "../../lib/types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function MyAppointments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = () => {
    api.getMyAppointments().then(setAppointments).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAppointments(); }, []);

  const filtered = appointments.filter((a) => {
    if (tab === "upcoming") return ["PENDING", "CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"].includes(a.status);
    if (tab === "cancelled") return ["CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status);
    return ["COMPLETED"].includes(a.status);
  });

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await api.cancelAppointment(cancelId);
      setAppointments((prev) => prev.map((a) => a.id === cancelId ? { ...a, status: "CANCELLED" } : a));
      setCancelId(null);
      toast("Appointment cancelled", "success");
    } catch { toast("Failed to cancel", "error"); }
    setCancelling(false);
  };

  const handleCheckIn = async (id: string) => {
    try {
      const queueEntry = await api.checkIn(id);
      toast(`Checked in! Your token number is #${queueEntry.token}`, "success");
      fetchAppointments();
    } catch (err: any) { toast(err.message || "Check-in failed", "error"); }
  };

  const tabs: { key: typeof tab; label: string; icon: string }[] = [
    { key: "upcoming", label: "Upcoming", icon: "upcoming" },
    { key: "past", label: "Past", icon: "history" },
    { key: "cancelled", label: "Cancelled", icon: "cancel" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">My Appointments</h1>

      <div className="flex gap-2 border-b border-outline-variant/30 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title={`No ${tab} appointments`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((apt) => (
            <div key={apt.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-container flex flex-col items-center justify-center shrink-0">
                <strong className="text-lg text-on-primary">{new Date(apt.startsAt).getDate()}</strong>
                <small className="text-xs text-on-primary-container">{new Date(apt.startsAt).toLocaleDateString(undefined, { month: "short" })}</small>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-on-surface truncate">Dr. {apt.doctor?.user?.name}</h3>
                <p className="text-sm text-on-surface-variant">{new Date(apt.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                {apt.queueEntry && <p className="text-xs text-on-surface-variant">Token #{apt.queueEntry.token}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge status={apt.status} />
                {apt.status === "CONFIRMED" && (
                  <Button size="sm" onClick={() => handleCheckIn(apt.id)}>Check in</Button>
                )}
                {["PENDING", "CONFIRMED"].includes(apt.status) && (
                  <Button size="sm" variant="danger" onClick={() => setCancelId(apt.id)}>Cancel</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Appointment">
        <p className="text-sm text-on-surface-variant mb-4">Are you sure you want to cancel this appointment?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setCancelId(null)}>Keep it</Button>
          <Button variant="danger" onClick={handleCancel} disabled={cancelling}>{cancelling ? "Cancelling..." : "Cancel appointment"}</Button>
        </div>
      </Modal>
    </div>
  );
}