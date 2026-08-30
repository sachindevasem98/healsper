import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { DoctorLeave } from "../../lib/types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import EmptyState from "../../components/ui/EmptyState";
import Spinner from "../../components/ui/Spinner";

export default function LeaveManager() {
  const [leaves, setLeaves] = useState<DoctorLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMyLeaves().then(setLeaves).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!startDate || !endDate) return;
    setAdding(true);
    setError("");
    try {
      const leave = await api.createLeave({ startsAt: startDate, endsAt: endDate, reason: reason || undefined });
      setLeaves((prev) => [...prev, leave]);
      setStartDate(""); setEndDate(""); setReason("");
    } catch (err: any) { setError(err.message || "Failed"); }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteLeave(id);
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">My Leaves</h1>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        <h2 className="text-sm font-medium text-on-surface mb-4">Add Leave Period</h2>
        {error && <p className="text-xs text-error mb-3">{error}</p>}
        <div className="flex items-end gap-3 flex-wrap">
          <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" className="w-48" />
          <Button onClick={handleAdd} disabled={adding}>{adding ? "Adding..." : "Add Leave"}</Button>
        </div>
      </div>

      {leaves.length === 0 ? (
        <EmptyState title="No leaves scheduled" />
      ) : (
        <div className="space-y-2">
          {leaves.map((leave) => (
            <div key={leave.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">
                  {new Date(leave.startsAt).toLocaleDateString()} — {new Date(leave.endsAt).toLocaleDateString()}
                </p>
                {leave.reason && <p className="text-xs text-on-surface-variant mt-1">{leave.reason}</p>}
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDelete(leave.id)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
