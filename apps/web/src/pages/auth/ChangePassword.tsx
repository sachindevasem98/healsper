import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { validate, rules } from "../../lib/validate";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const backRoute =
    user?.role === "ADMIN" ? "/admin" : user?.role === "DOCTOR" ? "/doctor" : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setSuccess("");

    const fieldErrors = validate(
      { currentPassword, newPassword, confirmPassword },
      {
        currentPassword: [rules.required("Current password")],
        newPassword: [rules.required("New password"), rules.minLength(8)],
        confirmPassword: [rules.required("Confirm new password")],
      }
    );
    if (newPassword !== confirmPassword) {
      fieldErrors.confirmPassword = "Passwords do not match";
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed successfully");
    } catch (err: any) {
      setServerError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-headline-md text-headline-md text-primary mb-6">Change Password</h1>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6">
        {serverError && (
          <div className="bg-surface-container-low border border-error/30 text-error text-sm px-4 py-3 rounded-xl mb-4">{serverError}</div>
        )}
        {success && (
          <div className="bg-surface-container-low border border-tertiary-container/30 text-primary text-sm px-4 py-3 rounded-xl mb-4">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setErrors((p) => ({ ...p, currentPassword: "" })); }}
            error={errors.currentPassword}
            required
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: "" })); }}
            error={errors.newPassword}
            required
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
            error={errors.confirmPassword}
            required
            placeholder="Re-enter new password"
          />
          <div className="flex items-center justify-between pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Update password"}
            </Button>
            <Link to={backRoute} className="text-sm text-on-surface-variant hover:text-on-surface hover:underline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}