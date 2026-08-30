import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { Doctor } from "../../lib/types";
import SearchInput from "../../components/ui/SearchInput";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function DoctorBrowse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const fetchDoctors = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const data = await api.getDoctorsPage(q || undefined, p, 12);
      setDoctors(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setDoctors([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(search, page); }, [page, search, fetchDoctors]);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setPage(1);
  }, [searchParams]);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); };

  return (
    <div className="space-y-6 max-w-container-max mx-auto">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary">Find a Doctor</h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Browse available specialists</p>
      </div>

      <SearchInput value={search} onSearch={handleSearch} placeholder="Search by name or specialization..." />

      {loading ? <Spinner /> : doctors.length === 0 ? (
        <EmptyState title="No doctors found" description="Try a different search" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/doctors/${doc.id}`)}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 shadow-sm hover:shadow-md hover:border-tertiary-container transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-semibold shrink-0">
                    {doc.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-on-surface truncate">Dr. {doc.user.name}</h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">{doc.specialization || "General Medicine"}</p>
                  </div>
                </div>
                {doc.clinic && (
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {doc.clinic.name}
                  </p>
                )}
                {doc.consultationFee != null && (
                  <p className="text-sm font-semibold text-primary mt-2">₹{Number(doc.consultationFee).toFixed(0)}</p>
                )}
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}