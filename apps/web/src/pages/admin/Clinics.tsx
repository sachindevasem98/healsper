import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Clinic } from "../../lib/types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import SearchInput from "../../components/ui/SearchInput";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function ClinicManager() {
  const { toast } = useToast();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClinics = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const data = await api.getClinics(q || undefined);
      setClinics(Array.isArray(data) ? data : []);
    } catch { setClinics([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClinics(search); }, [search, fetchClinics]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const clinic = await api.createClinic({ name, address: address || undefined });
      setClinics((prev) => [...prev, clinic]);
      setShowAdd(false); setName(""); setAddress("");
      toast("Clinic created successfully", "success");
    } catch (err: any) { toast(err.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.deleteClinic(id);
      setClinics((prev) => prev.filter((c) => c.id !== id));
      toast("Clinic deleted", "success");
    } catch (err: any) { toast(err.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-primary">Clinics</h1>
        <Button onClick={() => setShowAdd(true)}>Add Clinic</Button>
      </div>

      <SearchInput onSearch={setSearch} placeholder="Search clinics..." />

      {loading ? <Spinner /> : clinics.length === 0 ? (
        <EmptyState title="No clinics found" action={<Button onClick={() => setShowAdd(true)} size="sm">Add clinic</Button>} />
      ) : (
        <div className="space-y-2">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-on-surface">{clinic.name}</h3>
                {clinic.address && <p className="text-sm text-on-surface-variant">{clinic.address}</p>}
                <p className="text-xs text-on-surface-variant mt-1">{clinic._count?.doctors || 0} doctors · {clinic._count?.departments || 0} departments</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDelete(clinic.id)}>Delete</Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Clinic">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinic name" />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Adding..." : "Add"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
