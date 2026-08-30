import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

export default function DoctorProfileEdit() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getDoctorProfile().then((p) => { setProfile(p); setForm(p); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await api.updateDoctorProfile({
        specialization: form.specialization || null,
        qualification: form.qualification || null,
        consultationDuration: form.consultationDuration ? Number(form.consultationDuration) : null,
        consultationFee: form.consultationFee ? Number(form.consultationFee) : null,
        clinicId: form.clinicId || null,
      });
      setProfile(updated);
      setMsg("Profile updated successfully");
    } catch { setMsg("Failed to update profile"); }
    setSaving(false);
  };

  if (loading) return <Spinner />;
  if (!profile) return <div className="text-center py-12 text-on-surface-variant">Profile not found</div>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">My Profile</h1>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={profile.user?.name || ""} disabled />
          <Input label="Email" value={profile.user?.email || ""} disabled />
        </div>
        <Input
          label="Specialization"
          value={form.specialization || ""}
          onChange={(e) => setForm({ ...form, specialization: e.target.value })}
          placeholder="e.g. Cardiology"
        />
        <Input
          label="Qualification"
          value={form.qualification || ""}
          onChange={(e) => setForm({ ...form, qualification: e.target.value })}
          placeholder="e.g. MD, MBBS"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Consultation Duration (min)"
            type="number"
            value={form.consultationDuration || ""}
            onChange={(e) => setForm({ ...form, consultationDuration: e.target.value })}
            placeholder="15"
          />
          <Input
            label="Consultation Fee"
            type="number"
            value={form.consultationFee || ""}
            onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      {msg && <p className="text-sm text-primary-700">{msg}</p>}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        <Link to="/change-password" className="text-sm text-primary-700 font-medium hover:underline">Change password</Link>
      </div>
    </div>
  );
}
