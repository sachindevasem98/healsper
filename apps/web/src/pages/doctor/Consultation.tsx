import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Appointment } from "../../lib/types";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

type MedRow = { medicine: string; dosage: string; frequency: string; timing: string; duration: string };

export default function ConsultationForm() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [notes, setNotes] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [advice, setAdvice] = useState("");
  const [meds, setMeds] = useState<MedRow[]>([{ medicine: "", dosage: "", frequency: "", timing: "", duration: "" }]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");

  useEffect(() => {
    if (!appointmentId) return;
    api.getMyAppointments().then((apts) => {
      const apt = apts.find((a) => a.id === appointmentId);
      setAppointment(apt || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [appointmentId]);

  const addMed = () => setMeds([...meds, { medicine: "", dosage: "", frequency: "", timing: "", duration: "" }]);
  const removeMed = (i: number) => setMeds(meds.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof MedRow, value: string) => {
    const updated = [...meds];
    updated[i] = { ...updated[i], [field]: value };
    setMeds(updated);
  };

  const handleSubmit = async () => {
    if (!appointmentId) return;
    if (!symptoms.trim() && !diagnosis.trim()) {
      toast("Please enter symptoms or diagnosis", "error");
      return;
    }
    setSubmitting(true);
    try {
      const validMeds = meds.filter((m) => m.medicine);
      const result = await api.createConsultation({
        appointmentId,
        notes: notes || undefined,
        symptoms: symptoms || undefined,
        diagnosis: diagnosis || undefined,
        treatment: treatment || undefined,
        prescription: validMeds.length > 0 ? {
          diagnosis: diagnosis || undefined,
          advice: advice || undefined,
          items: validMeds,
        } : undefined,
      });

      if (followUpDate && result.id) {
        await api.createFollowUp(result.id, {
          scheduledFor: followUpDate,
          reason: followUpReason || undefined,
        }).catch(() => {});
      }

      setSuccess(true);
      toast("Consultation completed successfully", "success");
    } catch (err: any) { toast(err.message || "Failed", "error"); }
    setSubmitting(false);
  };

  if (loading) return <Spinner />;
  if (!appointment) return <div className="text-center py-12 text-on-surface-variant">Appointment not found</div>;

  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
        <h1 className="font-headline-md text-headline-md text-primary">Consultation Completed</h1>
        <p className="text-on-surface-variant">Patient: {appointment.patient?.user?.name}</p>
        <Button onClick={() => navigate("/doctor/queue")} className="mt-4">Back to Queue</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="text-sm text-on-surface-variant hover:text-on-surface">&larr; Back</button>
      <h1 className="font-headline-md text-headline-md text-primary">Consultation — {appointment.patient?.user?.name}</h1>

      <div className="space-y-4">
        <Textarea label="Symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Patient-reported symptoms" />
        <Textarea label="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Your diagnosis" />
        <Textarea label="Treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="Treatment plan" />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-on-surface">Prescription</h2>
            <Button size="sm" variant="ghost" onClick={addMed}><span className="material-symbols-outlined text-base mr-1">add</span>Add medicine</Button>
          </div>
          {meds.map((med, i) => (
            <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-3 mb-2 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Medicine" value={med.medicine} onChange={(e) => updateMed(i, "medicine", e.target.value)} className="flex-1" />
                <Input placeholder="Dosage" value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} className="w-28" />
                <Input placeholder="Frequency" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} className="w-28" />
                {meds.length > 1 && (
                  <button onClick={() => removeMed(i)} className="shrink-0 text-on-surface-variant hover:text-error self-center" aria-label="Remove medicine">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Timing (e.g. before food)" value={med.timing} onChange={(e) => updateMed(i, "timing", e.target.value)} className="flex-1" />
                <Input placeholder="Duration (e.g. 5 days)" value={med.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} className="w-40" />
              </div>
            </div>
          ))}
          <Textarea label="Advice" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Diet/lifestyle advice" className="mt-3" />
        </div>

        <div className="border-t border-outline-variant/30 pt-4">
          <h2 className="text-sm font-medium text-on-surface mb-2">Schedule Follow-up (optional)</h2>
          <div className="flex gap-3 items-end">
            <Input label="Date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            <Input label="Reason" value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} placeholder="Follow-up reason" className="flex-1" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting ? "Saving..." : "Complete Consultation"}
        </Button>
      </div>
    </div>
  );
}
