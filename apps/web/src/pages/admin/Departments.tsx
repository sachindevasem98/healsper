import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Clinic, Department } from "../../lib/types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import SearchInput from "../../components/ui/SearchInput";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function DepartmentManager() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([api.getDepartments(q || undefined), api.getClinics()]);
      setDepartments(Array.isArray(d) ? d : []);
      setClinics(Array.isArray(c) ? c : []);
    } catch { setDepartments([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(search); }, [search, fetchData]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setClinicId("");
    setNameError("");
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setClinicId(dept.clinicId || "");
    setNameError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Department name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateDepartment(editing.id, { name: name.trim(), clinicId: clinicId || undefined });
        const clinic = clinics.find((c) => c.id === clinicId);
        setDepartments((prev) =>
          prev.map((d) => (d.id === editing.id ? { ...updated, _count: d._count, clinic } : d))
        );
        toast("Department updated successfully", "success");
      } else {
        const dept = await api.createDepartment({ name: name.trim(), clinicId: clinicId || undefined });
        setDepartments((prev) => [...prev, dept]);
        toast("Department created successfully", "success");
      }
      setModalOpen(false);
      setName(""); setClinicId(""); setEditing(null);
    } catch (err: any) { toast(err.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      toast("Department deleted", "success");
    } catch (err: any) { toast(err.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-primary">Departments</h1>
        <Button onClick={openAdd}>Add Department</Button>
      </div>

      <SearchInput onSearch={setSearch} placeholder="Search departments..." />

      {loading ? <Spinner /> : departments.length === 0 ? (
        <EmptyState title="No departments found" />
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-on-surface">{dept.name}</h3>
                {dept.clinic && <p className="text-sm text-on-surface-variant">{dept.clinic.name}</p>}
                <p className="text-xs text-on-surface-variant mt-1">{dept._count?.doctors || 0} doctors</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(dept)}>
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(dept.id)}>Delete</Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Department" : "Add Department"}>
        <div className="space-y-4">
          <Input label="Name *" value={name} onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }} placeholder="Department name" error={nameError} />
          <Select label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} options={clinics.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select clinic (optional)" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : (editing ? "Save" : "Add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}