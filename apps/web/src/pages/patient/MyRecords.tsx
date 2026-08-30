import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { Consultation, FollowUp, Prescription } from "../../lib/types";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

type RecordsData = Consultation[] | Prescription[] | FollowUp[];

export default function MyRecords() {
  const [tab, setTab] = useState<"consultations" | "prescriptions" | "followups">("consultations");
  const [data, setData] = useState<RecordsData>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = tab === "consultations" ? api.getMyConsultations :
                    tab === "prescriptions" ? api.getMyPrescriptions :
                    api.getMyFollowUps;
    fetcher().then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, [tab]);

  const tabs: { key: typeof tab; label: string; icon: string }[] = [
    { key: "consultations", label: "Consultations", icon: "clinical_notes" },
    { key: "prescriptions", label: "Prescriptions", icon: "medication" },
    { key: "followups", label: "Follow-ups", icon: "event_repeat" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">My Records</h1>

      <div className="flex gap-2 border-b border-outline-variant/30 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : data.length === 0 ? (
        <EmptyState title={`No ${tab} yet`} />
      ) : (
        <div className="space-y-3">
          {tab === "consultations" && (data as Consultation[]).map((c) => (
            <div key={c.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-on-surface">Dr. {c.doctor?.user?.name}</p>
                <p className="text-xs text-on-surface-variant">{new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
              {c.diagnosis && <p className="text-sm text-on-surface-variant"><strong>Diagnosis:</strong> {c.diagnosis}</p>}
              {c.symptoms && <p className="text-sm text-on-surface-variant"><strong>Symptoms:</strong> {c.symptoms}</p>}
              {c.treatment && <p className="text-sm text-on-surface-variant"><strong>Treatment:</strong> {c.treatment}</p>}
            </div>
          ))}

          {tab === "prescriptions" && (data as Prescription[]).map((p) => (
            <div key={p.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-on-surface">Dr. {p.consultation?.doctor?.user?.name}</p>
                <p className="text-xs text-on-surface-variant">{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              {p.diagnosis && <p className="text-sm text-on-surface-variant mb-2"><strong>Diagnosis:</strong> {p.diagnosis}</p>}
              <div className="space-y-1">
                {p.items?.map((item) => (
                  <div key={item.id} className="text-sm text-on-surface bg-surface-container-low rounded-xl px-3 py-2">
                    <strong>{item.medicine}</strong> — {item.dosage}, {item.frequency}
                    {item.timing ? `, ${item.timing}` : ""}{item.duration ? `, ${item.duration}` : ""}
                  </div>
                ))}
              </div>
              {p.advice && <p className="text-sm text-on-surface-variant mt-2"><strong>Advice:</strong> {p.advice}</p>}
            </div>
          ))}

          {tab === "followups" && (data as FollowUp[]).map((f) => (
            <div key={f.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-container flex flex-col items-center justify-center shrink-0">
                <strong className="text-lg text-on-primary">{new Date(f.scheduledFor).getDate()}</strong>
                <small className="text-xs text-on-primary-container">{new Date(f.scheduledFor).toLocaleDateString(undefined, { month: "short" })}</small>
              </div>
              <div>
                <h3 className="font-medium text-on-surface">Dr. {f.doctor?.user?.name}</h3>
                {f.reason && <p className="text-sm text-on-surface-variant">{f.reason}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}