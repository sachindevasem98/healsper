import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import { useSocket } from "../../lib/socket";
import { useToast } from "../../context/ToastContext";
import type { Appointment } from "../../lib/types";
import Select from "../../components/ui/Select";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["WAITING", "CANCELLED"],
  WAITING: ["IN_CONSULTATION", "CANCELLED"],
  IN_CONSULTATION: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  RESCHEDULED: [],
  NO_SHOW: [],
};

export default function AdminAppointments() {
  const { toast } = useToast();
  const { connected, on } = useSocket();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"today" | "all">("today");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const requestSeq = useRef(0);

  const fetchAppointments = useCallback(async () => {
    const seq = ++requestSeq.current;
    const data = await api.getMyAppointments({ date: scope, tz });
    if (seq === requestSeq.current) {
      setAppointments(Array.isArray(data) ? data : []);
    }
  }, [scope, tz]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments()
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [fetchAppointments]);

  useEffect(() => {
    if (!connected) return;
    fetchAppointments().catch(() => {});
    return on("overview:changed", fetchAppointments);
  }, [connected, on, fetchAppointments]);

  const visible = appointments.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const updated = await api.updateAppointmentStatus(id, status);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: updated.status as Appointment["status"] } : a)));
      toast(`Appointment marked ${status.replace(/_/g, " ").toLowerCase()}`, "success");
    } catch (err: any) {
      toast(err.message || "Failed to update status", "error");
    }
    setUpdatingId(null);
  };

  const handleDelete = async (apt: Appointment) => {
    setDeletingId(apt.id);
    try {
      await api.deleteAppointment(apt.id);
      setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
      setConfirmDelete(null);
      toast("Appointment deleted successfully", "success");
    } catch (err: any) {
      toast(err.message || "Failed to delete appointment", "error");
    }
    setDeletingId(null);
  };

  const statusOptions = Object.keys(ALLOWED_TRANSITIONS).map((s) => ({ value: s, label: s.replace(/_/g, " ") }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">Appointments</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setScope("today")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${scope === "today" ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
          >
            Today
          </button>
          <button
            onClick={() => setScope("all")}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${scope === "all" ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
          >
            All
          </button>
        </div>
      </div>

      <div className="max-w-xs">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={statusOptions}
          placeholder="All statuses"
        />
      </div>

      {loading ? <Spinner /> : visible.length === 0 ? (
        <EmptyState title="No appointments found" />
      ) : (
        <div className="space-y-2">
          {visible.map((apt) => {
            const nextStates = ALLOWED_TRANSITIONS[apt.status] || [];
            return (
              <div key={apt.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[220px]">
                  <h3 className="font-medium text-on-surface">{apt.patient?.user?.name || "Patient"}</h3>
                  <p className="text-sm text-on-surface-variant">
                    {apt.doctor?.user?.name ? `Dr. ${apt.doctor.user.name}` : "Doctor"} · {new Date(apt.startsAt).toLocaleString()}
                  </p>
                  {apt.reason && <p className="text-xs text-on-surface-variant mt-1">"{apt.reason}"</p>}
                </div>
                <Badge status={apt.status} />
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    {nextStates.length === 0 ? (
                      <p className="text-xs text-on-surface-variant">Final state</p>
                    ) : (
                      <Select
                        value=""
                        onChange={(e) => { if (e.target.value) handleStatusChange(apt.id, e.target.value); }}
                        options={nextStates.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                        placeholder={updatingId === apt.id ? "Updating..." : "Update status"}
                        disabled={updatingId === apt.id}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmDelete(apt)}
                    disabled={deletingId !== null}
                    aria-label="Delete appointment"
                    title="Delete appointment"
                    className="p-2 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete appointment">
        <p className="text-sm text-on-surface-variant">
          Are you sure you want to permanently delete this appointment
          {confirmDelete?.patient?.user?.name ? ` for ${confirmDelete.patient.user.name}` : ""}
          {confirmDelete ? ` on ${new Date(confirmDelete.startsAt).toLocaleString()}?` : "?"} This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deletingId === confirmDelete?.id}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={deletingId !== null}>
            {deletingId === confirmDelete?.id ? <Spinner /> : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}