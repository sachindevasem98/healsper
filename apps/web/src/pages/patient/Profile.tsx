import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function PatientProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getMyProfile().then((p) => { setProfile(p); setForm(p); }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await api.updateMyProfile({
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        phone: form.phone || null,
        address: form.address || null,
        emergencyContact: form.emergencyContact || null,
      });
      setProfile(updated);
      setMsg("Profile updated");
    } catch { setMsg("Failed to update"); }
    setSaving(false);
  };

  if (!profile) return null;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">My Profile</h1>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={profile.user?.name || ""} disabled />
          <Input label="Email" value={profile.user?.email || ""} disabled />
        </div>
        <Input label="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
        <Input label="Gender" value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Gender" />
        <Input label="Date of Birth" type="date" value={form.dateOfBirth?.split("T")[0] || ""} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        <Input label="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
        <Input label="Emergency Contact" value={form.emergencyContact || ""} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Emergency contact" />
      </div>

      {msg && <p className="text-sm text-primary">{msg}</p>}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        <Link to="/change-password" className="text-sm text-primary font-medium hover:underline">Change password</Link>
      </div>
    </div>
  );
}
