import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { DoctorSchedule } from "../../lib/types";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK = [0, 1, 2, 3, 4, 5, 6];

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDoctorProfile().then((p) => api.getSchedules(p.id)).then(setSchedules).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped: Record<number, DoctorSchedule[]> = {};
  schedules.forEach((s) => { if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = []; grouped[s.dayOfWeek].push(s); });

  const handleAdd = async () => {
    setAdding(true);
    setError("");
    try {
      const newSchedules = await api.bulkSchedules({ schedules: [...schedules, { dayOfWeek: day, startTime, endTime }] });
      setSchedules(newSchedules);
    } catch (err: any) { setError(err.message || "Failed"); }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  if (loading) return <Spinner />;

  const fieldClass = "h-10 px-3 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary-container/30";

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">My Schedule</h1>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        <h2 className="text-sm font-medium text-on-surface mb-4">Current Schedule</h2>
        {WEEK.map((d) => (
          <div key={d} className="flex items-center gap-3 py-2 border-b border-outline-variant/20 last:border-0">
            <span className="w-16 text-sm font-medium text-on-surface">{FULL_DAYS[d]}</span>
            <div className="flex gap-2 flex-wrap flex-1">
              {grouped[d]?.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-800 px-2.5 py-1 rounded-full">
                  {s.startTime} - {s.endTime}
                  <button onClick={() => handleDelete(s.id)} className="text-primary-600 hover:text-error ml-1" aria-label="Remove">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </span>
              ))}
              {!grouped[d]?.length && <span className="text-xs text-on-surface-variant">No schedule</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        <h2 className="text-sm font-medium text-on-surface mb-4">Add Time Slot</h2>
        {error && <p className="text-xs text-error mb-3">{error}</p>}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Day</label>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={fieldClass}>
              {WEEK.map((d) => <option key={d} value={d}>{FULL_DAYS[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={fieldClass} />
          </div>
          <Button onClick={handleAdd} disabled={adding}>{adding ? "Adding..." : "Add"}</Button>
        </div>
      </div>
    </div>
  );
}