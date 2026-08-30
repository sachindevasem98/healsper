import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { useSocket } from "../../lib/socket";
import type { QueueEntry } from "../../lib/types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connected, on, joinDoctorRoom } = useSocket();
  const [doctorId, setDoctorId] = useState<string>("");
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDoctorProfile().then((p) => {
      setDoctorId(p.id);
      joinDoctorRoom(p.id);
      return api.getQueue(p.id);
    }).then(setQueue).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    const unsub = on("queue:updated", (updatedEntry: QueueEntry) => {
      setQueue((prev) => {
        const idx = prev.findIndex((e) => e.id === updatedEntry.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedEntry;
          return next;
        }
        return [...prev, updatedEntry];
      });
    });
    return unsub;
  }, [doctorId]);

  const handleAction = async (id: string, action: "call" | "skip" | "serve") => {
    try {
      if (action === "call") await api.callPatient(id);
      else if (action === "skip") await api.skipPatient(id);
      else await api.servePatient(id);
      if (doctorId) api.getQueue(doctorId).then(setQueue);
    } catch (err: any) { toast(err.message, "error"); }
  };

  if (loading) return <Spinner />;

  const current = queue.find((e) => e.status === "CALLED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-primary inline-flex items-center gap-2">
          Patient Queue
          {connected && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" title="Live updates" />}
        </h1>
        <Button variant="outline" size="sm" onClick={() => doctorId && api.getQueue(doctorId).then(setQueue)}>Refresh</Button>
      </div>

      {current && (
        <div className="bg-surface-container-low border border-tertiary-container/40 rounded-2xl p-4">
          <p className="text-sm text-primary font-medium">Currently Serving</p>
          <p className="text-lg font-bold text-on-surface">{current.patient?.user?.name} — Token #{current.token}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => navigate(`/doctor/consultation/${current.appointmentId}`)}>Start Consultation</Button>
            <Button size="sm" variant="outline" onClick={() => handleAction(current.id, "serve")}>Complete</Button>
          </div>
        </div>
      )}

      {queue.length === 0 ? (
        <EmptyState title="Queue is empty" description="No patients in queue today" />
      ) : (
        <div className="space-y-2">
          {queue.map((entry) => (
            <div key={entry.id} className={`bg-surface-container-lowest rounded-2xl border shadow-sm p-4 flex items-center gap-4 ${entry.status === "CALLED" ? "border-tertiary-container" : "border-outline-variant/30"}`}>
              <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-on-primary">#{entry.token}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-on-surface truncate">{entry.patient?.user?.name}</h3>
                <p className="text-xs text-on-surface-variant">
                  {entry.checkedInAt
                    ? new Date(entry.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
              <Badge status={entry.status} />
              <div className="flex gap-1">
                {entry.status === "WAITING" && (
                  <>
                    <Button size="sm" onClick={() => handleAction(entry.id, "call")}>Call</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleAction(entry.id, "skip")}>Skip</Button>
                  </>
                )}
                {entry.status === "CALLED" && (
                  <>
                    <Button size="sm" onClick={() => navigate(`/doctor/consultation/${entry.appointmentId}`)}>Consult</Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(entry.id, "serve")}>Done</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}