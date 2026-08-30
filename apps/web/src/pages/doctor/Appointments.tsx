import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Appointment } from "../../lib/types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

const STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"] as const;

const CAN_ACT = new Set(["PENDING", "CONFIRMED"]);

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const nowLocalMin = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const inputCls =
  "w-full h-12 px-4 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary-container/30";

export default function DoctorAppointments() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  const [reschedTarget, setReschedTarget] = useState<Appointment | null>(null);
  const [reschedStartsAt, setReschedStartsAt] = useState("");
  const [reschedReason, setReschedReason] = useState("");
  const [reschedSaving, setReschedSaving] = useState(false);

  const [formErrors, setFormErrors] = useState<{ startsAt?: string; reason?: string }>({});

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    api
      .getDoctorAppointments({
        range: scope,
        status: statusFilter || undefined,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      })
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [scope, statusFilter, from, to]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const clearFilters = () => {
    setStatusFilter("");
    setFrom("");
    setTo("");
  };

  const openResched = (apt: Appointment) => {
    setReschedTarget(apt);
    setReschedStartsAt(toLocalInput(apt.startsAt));
    setReschedReason("");
    setFormErrors({});
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setFormErrors({ reason: "Reason is required" });
      return;
    }
    setCancelSaving(true);
    try {
      await api.cancelAppointment(cancelTarget.id, cancelReason.trim());
      toast("Appointment cancelled", "success");
      setCancelTarget(null);
      setCancelReason("");
      setFormErrors({});
      fetchAppointments();
    } catch (err: any) {
      toast(err.message || "Failed to cancel appointment", "error");
    }
    setCancelSaving(false);
  };

  const handleReschedule = async () => {
    if (!reschedTarget) return;
    const errs: { startsAt?: string; reason?: string } = {};
    if (!reschedStartsAt) errs.startsAt = "Select a new date and time";
    if (!reschedReason.trim()) errs.reason = "Reason is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setReschedSaving(true);
    try {
      await api.rescheduleAppointment(reschedTarget.id, new Date(reschedStartsAt).toISOString(), reschedReason.trim());
      toast("Appointment rescheduled", "success");
      setReschedTarget(null);
      setReschedStartsAt("");
      setReschedReason("");
      setFormErrors({});
      fetchAppointments();
    } catch (err: any) {
      toast(err.message || "Failed to reschedule appointment", "error");
    }
    setReschedSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">Appointments</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(["upcoming", "past"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${scope === s ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
            placeholder="All statuses"
          />
        </div>

        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} !w-44`} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} !w-44`} aria-label="To date" />

        {(statusFilter || from || to) && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
        )}
      </div>

      {loading ? <Spinner /> : appointments.length === 0 ? (
        <EmptyState title={`No ${scope} appointments`} description="Try adjusting the filters" />
      ) : (
        <div className="space-y-2">
          {appointments.map((apt) => {
            const canAct = CAN_ACT.has(apt.status);
            return (
              <div key={apt.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary-container flex flex-col items-center justify-center shrink-0">
                  <strong className="text-lg text-on-primary">{new Date(apt.startsAt).getDate()}</strong>
                  <small className="text-xs text-on-primary-container">{new Date(apt.startsAt).toLocaleDateString(undefined, { month: "short" })}</small>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-medium text-on-surface">{apt.patient?.user?.name || "Patient"}</h3>
                  <p className="text-sm text-on-surface-variant">{new Date(apt.startsAt).toLocaleString()}</p>
                  {apt.reason && <p className="text-xs text-on-surface-variant mt-1">"{apt.reason}"</p>}
                  {apt.statusReason && <p className="text-xs italic text-on-surface-variant mt-1">Status note: {apt.statusReason}</p>}
                </div>
                <Badge status={apt.status} />
                {canAct && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openResched(apt)}>Reschedule</Button>
                    <Button size="sm" variant="danger" onClick={() => { setCancelTarget(apt); setCancelReason(""); setFormErrors({}); }}>Cancel</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Appointment">
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              {cancelTarget.patient?.user?.name || "Patient"} · {new Date(cancelTarget.startsAt).toLocaleString()}
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-on-surface-variant">Reason for cancellation *</label>
              <textarea
                className="w-full min-h-24 px-4 py-2 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary-container/30"
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); if (formErrors.reason) setFormErrors((p) => ({ ...p, reason: undefined })); }}
                placeholder="Explain why this appointment is being cancelled"
                required
              />
              {formErrors.reason && <p className="text-xs text-error">{formErrors.reason}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCancelTarget(null)}>Close</Button>
              <Button variant="danger" onClick={handleCancel} disabled={cancelSaving}>
                {cancelSaving ? "Cancelling..." : "Cancel appointment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!reschedTarget} onClose={() => setReschedTarget(null)} title="Reschedule Appointment">
        {reschedTarget && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              {reschedTarget.patient?.user?.name || "Patient"} · currently {new Date(reschedTarget.startsAt).toLocaleString()}
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-on-surface-variant">New date and time *</label>
              <input
                type="datetime-local"
                className={`${inputCls} ${formErrors.startsAt ? "!border-error" : ""}`}
                value={reschedStartsAt}
                min={nowLocalMin()}
                onChange={(e) => { setReschedStartsAt(e.target.value); if (formErrors.startsAt) setFormErrors((p) => ({ ...p, startsAt: undefined })); }}
                required
              />
              {formErrors.startsAt && <p className="text-xs text-error">{formErrors.startsAt}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-on-surface-variant">Reason for rescheduling *</label>
              <textarea
                className="w-full min-h-24 px-4 py-2 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary-container/30"
                value={reschedReason}
                onChange={(e) => { setReschedReason(e.target.value); if (formErrors.reason) setFormErrors((p) => ({ ...p, reason: undefined })); }}
                placeholder="Explain why this appointment is being rescheduled"
                required
              />
              {formErrors.reason && <p className="text-xs text-error">{formErrors.reason}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setReschedTarget(null)}>Close</Button>
              <Button onClick={handleReschedule} disabled={reschedSaving}>
                {reschedSaving ? "Saving..." : "Reschedule appointment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}