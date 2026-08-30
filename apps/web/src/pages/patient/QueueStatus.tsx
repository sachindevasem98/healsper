import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useSocket } from "../../lib/socket";
import type { QueueEntry } from "../../lib/types";
import Spinner from "../../components/ui/Spinner";

export default function QueueStatus() {
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [waitInfo, setWaitInfo] = useState<{ patientsAhead: number; estimatedMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected, on, joinPatientRoom } = useSocket();

  useEffect(() => {
    api.getMyQueueStatus()
      .then((data) => {
        setQueueEntry(data.queueEntry);
        if (data.waitInfo) setWaitInfo(data.waitInfo);
        if (data.queueEntry?.patientId) joinPatientRoom(data.queueEntry.patientId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!queueEntry) return;
    const unsub = on("queue:status", (data: any) => {
      setQueueEntry((prev: any) => prev ? { ...prev, status: data.status } : prev);
    });
    return unsub;
  }, [queueEntry?.id]);

  if (loading) return <Spinner />;
  if (!queueEntry) return <div className="text-center py-12 text-on-surface-variant">No active queue entry</div>;

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    WAITING: { label: "Waiting", color: "text-warning-text bg-warning", icon: "hourglass_top" },
    CALLED: { label: "Called", color: "text-primary bg-primary-50", icon: "campaign" },
    SERVED: { label: "Served", color: "text-green-700 bg-green-100", icon: "check_circle" },
    SKIPPED: { label: "Skipped", color: "text-on-surface-variant bg-surface-container", icon: "skip_next" },
  };

  const cfg = statusConfig[queueEntry.status] || statusConfig.WAITING;

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">Queue Status</h1>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-8 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${cfg.color}`}>
          <span className="material-symbols-outlined text-base">{cfg.icon}</span> {cfg.label}
          {connected && <span className="w-2 h-2 rounded-full bg-green-400 ml-1" title="Live" />}
        </div>

        <div className="text-6xl font-bold text-primary mb-2">#{queueEntry.token}</div>
        <p className="text-on-surface-variant text-sm">Your token number</p>

        {queueEntry.status === "WAITING" && waitInfo && (
          <div className="mt-6 grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-2xl font-bold text-on-surface">{waitInfo.patientsAhead}</p>
              <p className="text-xs text-on-surface-variant">Patients ahead</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-2xl font-bold text-on-surface">~{waitInfo.estimatedMinutes}m</p>
              <p className="text-xs text-on-surface-variant">Estimated wait</p>
            </div>
          </div>
        )}

        {queueEntry.status === "CALLED" && (
          <p className="mt-4 text-primary font-medium">Please proceed to the consultation room</p>
        )}

        <div className="mt-6 text-left max-w-sm mx-auto space-y-2 text-sm text-on-surface-variant">
          <p>Appointment: {queueEntry.appointment?.startsAt ? new Date(queueEntry.appointment.startsAt).toLocaleTimeString() : "N/A"}</p>
        </div>
      </div>
    </div>
  );
}