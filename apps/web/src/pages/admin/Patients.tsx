import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import type { Patient } from "../../lib/types";
import SearchInput from "../../components/ui/SearchInput";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function PatientManager() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPatients = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const data = await api.getPatients(q || undefined);
      setPatients(Array.isArray(data) ? data : []);
    } catch { setPatients([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(search); }, [search, fetchPatients]);

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">Patients</h1>
      <SearchInput onSearch={setSearch} placeholder="Search patients..." />

      {loading ? <Spinner /> : patients.length === 0 ? (
        <EmptyState title="No patients found" />
      ) : (
        <div className="space-y-2">
          {patients.map((p) => (
            <div key={p.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant font-semibold text-sm shrink-0">
                {p.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-on-surface">{p.user.name}</h3>
                <p className="text-sm text-on-surface-variant">{p.user.email}{p.phone ? ` · ${p.phone}` : ""}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Joined {p.user.createdAt ? new Date(p.user.createdAt).toLocaleDateString() : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
