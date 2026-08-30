import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { Consultation, Patient } from "../../lib/types";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function PatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    Promise.all([
      api.getPatient(patientId),
      api.getPatientConsultations(patientId),
    ])
      .then(([p, c]) => { setPatient(p); setConsultations(Array.isArray(c) ? c : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <Spinner />;
  if (!patient) return <div className="text-center py-12 text-on-surface-variant">Patient not found</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-on-surface-variant hover:text-on-surface">&larr; Back</button>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        <h1 className="font-headline-md text-headline-md text-primary">{patient.user?.name}</h1>
        <p className="text-sm text-on-surface-variant">{patient.user?.email}</p>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-on-surface-variant">
          {patient.gender && <span>Gender: {patient.gender}</span>}
          {patient.phone && <span>Phone: {patient.phone}</span>}
          {patient.dateOfBirth && <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>}
        </div>
      </div>

      <h2 className="font-headline-sm text-headline-sm text-on-surface">Consultation History</h2>

      {consultations.length === 0 ? (
        <EmptyState title="No consultations yet" />
      ) : (
        <div className="space-y-3">
          {consultations.map((c) => (
            <div key={c.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm font-medium text-on-surface">
                  Dr. {c.doctor?.user?.name}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>

              {c.symptoms && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-on-surface-variant">Symptoms</p>
                  <p className="text-sm text-on-surface">{c.symptoms}</p>
                </div>
              )}
              {c.diagnosis && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-on-surface-variant">Diagnosis</p>
                  <p className="text-sm text-on-surface">{c.diagnosis}</p>
                </div>
              )}
              {c.treatment && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-on-surface-variant">Treatment</p>
                  <p className="text-sm text-on-surface">{c.treatment}</p>
                </div>
              )}

              {c.prescription && (
                <div className="mt-3 bg-surface-container-low rounded-2xl border border-outline-variant/20 p-3">
                  <p className="text-xs font-medium text-on-surface-variant mb-2">Prescription</p>
                  {c.prescription.diagnosis && (
                    <p className="text-sm text-on-surface mb-1">Diagnosis: {c.prescription.diagnosis}</p>
                  )}
                  <div className="space-y-1">
                    {c.prescription.items?.map((item) => (
                      <div key={item.id} className="text-sm text-on-surface">
                        <strong>{item.medicine}</strong> — {item.dosage}, {item.frequency}
                        {item.timing ? `, ${item.timing}` : ""}
                        {item.duration ? `, ${item.duration}` : ""}
                      </div>
                    ))}
                  </div>
                  {c.prescription.advice && (
                    <p className="text-sm text-on-surface-variant mt-2">Advice: {c.prescription.advice}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
