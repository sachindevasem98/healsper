import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { Doctor, DoctorSchedule } from "../../lib/types";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getDoctor(id).then(setDoctor).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!doctor) return <div className="text-center py-12 text-on-surface-variant">Doctor not found</div>;

  const handleBook = () => {
    if (user && user.role === "PATIENT") navigate(`/doctors/${doctor.id}/book`);
    else navigate("/login");
  };

  const groupedSchedule: Record<number, DoctorSchedule[]> = {};
  (doctor.schedules || []).forEach((s) => {
    if (!groupedSchedule[s.dayOfWeek]) groupedSchedule[s.dayOfWeek] = [];
    groupedSchedule[s.dayOfWeek].push(s);
  });

  return (
    <div className="space-y-6 max-w-container-max mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-xl shrink-0">
            {doctor.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline-md text-headline-md text-on-surface">Dr. {doctor.user.name}</h1>
            <p className="text-on-surface-variant">{doctor.specialization || "General Medicine"}</p>
            {doctor.qualification && <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">{doctor.qualification}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-on-surface-variant">
              {doctor.clinic && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {doctor.clinic.name}
                </span>
              )}
              {doctor.consultationFee != null && (
                <span className="text-primary font-semibold">₹{Number(doctor.consultationFee).toFixed(0)}</span>
              )}
              {doctor.consultationDuration != null && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  {doctor.consultationDuration} min
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Weekly Schedule</h2>
        {[1, 2, 3, 4, 5].map((day) => (
          <div key={day} className="flex items-center gap-4 py-2 border-b border-outline-variant/20 last:border-0">
            <span className="w-24 text-sm font-medium text-on-surface">{DAYS[day]}</span>
            {groupedSchedule[day]?.length ? (
              <div className="flex gap-2 flex-wrap">
                {groupedSchedule[day].map((s) => (
                  <span key={s.id} className="text-xs bg-primary-100 text-primary-800 px-3 py-1 rounded-full">
                    {s.startTime} - {s.endTime}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-on-surface-variant">Not available</span>
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleBook} size="lg" className="w-full">
        Book Appointment
      </Button>
    </div>
  );
}