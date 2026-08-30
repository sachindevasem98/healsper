import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import type { Clinic, Department, Doctor } from "../../lib/types";
import { getDepartmentOptions } from "../../lib/departmentOptions";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import ComboSelect from "../../components/ui/ComboSelect";
import Modal from "../../components/ui/Modal";
import SearchInput from "../../components/ui/SearchInput";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

type DoctorForm = {
  name: string;
  email: string;
  password: string;
  clinicId: string;
  departmentId: string;
  specialization: string;
  qualification: string;
  consultationFee: string;
};

const emptyForm: DoctorForm = {
  name: "",
  email: "",
  password: "",
  clinicId: "",
  departmentId: "",
  specialization: "",
  qualification: "",
  consultationFee: "",
};

export default function DoctorManager() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof DoctorForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const fetchDoctors = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const data = await api.getDoctors(q || undefined);
      setDoctors(Array.isArray(data) ? data : []);
    } catch { setDoctors([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(search); }, [search, fetchDoctors]);

  useEffect(() => {
    api.getDepartments().then((d) => setDepartments(Array.isArray(d) ? d : [])).catch(() => setDepartments([]));
    api.getClinics().then((c) => setClinics(Array.isArray(c) ? c : [])).catch(() => setClinics([]));
  }, []);

  const selectedDepartmentName = departments.find((d) => d.id === form.departmentId)?.name;
  const cascadeOptions = getDepartmentOptions(selectedDepartmentName);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (doc: Doctor) => {
    setEditing(doc);
    setForm({
      name: doc.user.name,
      email: doc.user.email,
      password: "",
      clinicId: doc.clinicId ?? "",
      departmentId: doc.departments?.[0]?.departmentId ?? "",
      specialization: doc.specialization ?? "",
      qualification: doc.qualification ?? "",
      consultationFee: doc.consultationFee != null ? String(doc.consultationFee) : "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const nextErrors: Partial<Record<keyof DoctorForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Enter a valid email address";
    if (!editing) {
      if (!form.password) nextErrors.password = "Password is required";
      else if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    }
    if (!form.clinicId) nextErrors.clinicId = "Please select a clinic";
    if (!form.departmentId) nextErrors.departmentId = "Please select a department";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateDoctor(editing.id, {
          name: form.name,
          email: form.email,
          departmentId: form.departmentId,
          clinicId: form.clinicId || null,
          qualification: form.qualification || null,
          specialization: form.specialization || null,
          consultationFee: form.consultationFee ? Number(form.consultationFee) : null,
        });
        setDoctors((prev) => prev.map((d) => (d.id === editing.id ? updated : d)));
        toast("Doctor updated successfully", "success");
      } else {
        await api.createDoctor({
          name: form.name,
          email: form.email,
          password: form.password,
          departmentId: form.departmentId,
          clinicId: form.clinicId || undefined,
          qualification: form.qualification || undefined,
          specialization: form.specialization || undefined,
          consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
        });
        fetchDoctors(search);
        toast("Doctor created successfully", "success");
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setErrors({});
    } catch (err: any) {
      toast(err.message || "Failed to save doctor", "error");
      if (err?.code === "DEPARTMENT_NOT_FOUND") setErrors((e) => ({ ...e, departmentId: "Selected department no longer exists" }));
      if (err?.code === "CLINIC_NOT_FOUND") setErrors((e) => ({ ...e, clinicId: "Selected clinic no longer exists" }));
    }
    setSaving(false);
  };

  const toggleActive = async (doc: Doctor) => {
    const next = !doc.isActive;
    setDoctors((prev) => prev.map((d) => (d.id === doc.id ? { ...d, isActive: next } : d)));
    try {
      await api.updateDoctor(doc.id, { isActive: next });
      toast(next ? "Doctor activated" : "Doctor deactivated", "success");
    } catch (err: any) {
      setDoctors((prev) => prev.map((d) => (d.id === doc.id ? { ...d, isActive: doc.isActive } : d)));
      toast(err.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the doctor account.")) return;
    try {
      await api.deleteDoctor(id);
      setDoctors((prev) => prev.filter((d) => d.id !== id));
      toast("Doctor deleted", "success");
    } catch (err: any) { toast(err.message, "error"); }
  };

  const setField = (field: keyof DoctorForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-primary">Doctors</h1>
        <Button onClick={openAdd}>Add Doctor</Button>
      </div>

      <SearchInput onSearch={setSearch} placeholder="Search doctors..." />

      {loading ? <Spinner /> : doctors.length === 0 ? (
        <EmptyState title="No doctors found" />
      ) : (
        <div className="space-y-2">
          {doctors.map((doc) => (
            <div key={doc.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-semibold text-sm shrink-0">
                {doc.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-on-surface">Dr. {doc.user.name}</h3>
                <p className="text-sm text-on-surface-variant">{doc.specialization || "General Medicine"} · {doc.user.email}</p>
                {doc.departments && doc.departments.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {doc.clinic && (
                      <span className="text-xs bg-primary-container/20 text-primary px-2 py-0.5 rounded-full">
                        {doc.clinic.name}
                      </span>
                    )}
                    {doc.departments.map((dd) => (
                      <span key={dd.departmentId} className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                        {dd.department.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${doc.isActive === false ? "bg-surface-container-low text-on-surface-variant" : "bg-tertiary-container/20 text-tertiary"}`}>
                {doc.isActive === false ? "Inactive" : "Active"}
              </span>
              <Button size="sm" variant="outline" onClick={() => toggleActive(doc)} title={doc.isActive === false ? "Activate" : "Deactivate"}>
                <span className="material-symbols-outlined text-sm">{doc.isActive === false ? "power_settings_new" : "do_not_disturb"}</span>
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(doc)}>
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(doc.id)}>Delete</Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Doctor" : "Add Doctor"}>
        <div className="space-y-4">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
            required
          />
          {!editing && (
            <Input
              label="Password *"
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              error={errors.password}
              required
              minLength={8}
            />
          )}
          <Select
            label="Clinic *"
            value={form.clinicId}
            onChange={(e) => setField("clinicId", e.target.value)}
            error={errors.clinicId}
            options={clinics.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select clinic"
            required
          />
          <Select
            label="Department *"
            value={form.departmentId}
            onChange={(e) => {
              setField("departmentId", e.target.value);
              setForm((prev) => ({ ...prev, specialization: "", qualification: "" }));
            }}
            error={errors.departmentId}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Select department"
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <ComboSelect
              label="Specialization"
              value={form.specialization}
              onChange={(e) => setField("specialization", e.target.value)}
              options={cascadeOptions.specializations}
              placeholder={form.departmentId ? "Select or type specialization" : "Select a department first"}
              disabled={!form.departmentId}
            />
            <ComboSelect
              label="Qualification"
              value={form.qualification}
              onChange={(e) => setField("qualification", e.target.value)}
              options={cascadeOptions.qualifications}
              placeholder={form.departmentId ? "Select or type qualification" : "Select a department first"}
              disabled={!form.departmentId}
            />
          </div>
          <Input
            label="Consultation Fee"
            type="number"
            value={form.consultationFee}
            onChange={(e) => setField("consultationFee", e.target.value)}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-container text-white hover:bg-primary"
            >
              {saving ? "Saving..." : (editing ? "Save Changes" : "Add Doctor")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}