import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { Doctor, DoctorSchedule } from "../../lib/types";
import { localDayKey } from "../../lib/dates";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Textarea from "../../components/ui/Textarea";
import Spinner from "../../components/ui/Spinner";

type Availability = { schedules: DoctorSchedule[]; duration: number; booked: string[] };

export default function BookAppointment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getDoctor(id), api.getDoctorAvailability(id)])
      .then(([d, a]) => { setDoctor(d); setAvailability(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!doctor || !availability) return <div className="text-center py-12 text-on-surface-variant">Doctor not found</div>;

  // Generate available dates from schedules
  const availableDates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    if (availability.schedules.some((s) => s.dayOfWeek === dayOfWeek)) {
      availableDates.push(localDayKey(date));
    }
  }

  // Generate time slots for selected date
  const slots: string[] = [];
  if (selectedDate) {
    const date = new Date(selectedDate);
    const daySchedules = availability.schedules.filter((s) => s.dayOfWeek === date.getDay());
    const booked = availability.booked.map((b: string) => new Date(b).toISOString());
    const now = new Date();
    const isToday = selectedDate === localDayKey(now);
    const nowKey = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    daySchedules.forEach((schedule) => {
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      let mins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      while (mins + availability.duration <= endMins) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const slotTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const slotDate = new Date(`${selectedDate}T${slotTime}:00`);
        if (!booked.includes(slotDate.toISOString()) && !(isToday && slotTime <= nowKey)) {
          slots.push(slotTime);
        }
        mins += availability.duration;
      }
    });
  }

  const handleBook = async () => {
    if (!selectedSlot || !id) return;
    setBooking(true);
    setError("");
    try {
      await api.bookAppointment({
        doctorId: id,
        startsAt: `${selectedDate}T${selectedSlot}:00`,
        reason: reason || undefined,
      });
      setSuccess(true);
      toast("Appointment booked successfully!", "success");
    } catch (err: any) {
      setError(err.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Appointment Booked!</h1>
        <p className="text-on-surface-variant">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at {selectedSlot} with Dr. {doctor.user.name}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Button onClick={() => navigate("/appointments")} variant="primary">View Appointments</Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>
      <h1 className="font-headline-md text-headline-md text-primary">Book with Dr. {doctor.user.name}</h1>

      {error && <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl">{error}</div>}

      <div>
        <h2 className="text-sm font-medium text-on-surface mb-3">Select Date</h2>
        <div className="flex gap-2 flex-wrap">
          {availableDates.map((date) => (
            <button
              key={date}
              onClick={() => { setSelectedDate(date); setSelectedSlot(""); }}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                selectedDate === date
                  ? "bg-primary text-on-primary border-primary"
                  : "border-outline-variant hover:border-tertiary-container"
              }`}
            >
              {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div>
          <h2 className="text-sm font-medium text-on-surface mb-3">Select Time</h2>
          {slots.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No available slots for this date</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selectedSlot === slot
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant hover:border-tertiary-container"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlot && (
        <div className="space-y-4">
          <Textarea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief description of your concern" />
          <div className="bg-surface-container-low rounded-xl p-4">
            <p className="text-sm text-on-surface">
              <strong>Date:</strong> {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-sm text-on-surface"><strong>Time:</strong> {selectedSlot}</p>
            <p className="text-sm text-on-surface"><strong>Doctor:</strong> Dr. {doctor.user.name}</p>
            <p className="text-sm text-on-surface"><strong>Duration:</strong> {availability.duration} minutes</p>
          </div>
          <Button onClick={handleBook} disabled={booking} className="w-full" size="lg">
            {booking ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      )}
    </div>
  );
}
