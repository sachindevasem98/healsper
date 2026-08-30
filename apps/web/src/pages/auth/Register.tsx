import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { validate, rules } from "../../lib/validate";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const fieldErrors = validate(
      { name, email, password, confirmPassword },
      {
        name: [rules.required("Full name")],
        email: [rules.required("Email"), rules.email()],
        password: [rules.required("Password"), rules.minLength(8)],
        confirmPassword: [
          rules.required("Please confirm your password"),
          { test: (v) => v === password, message: "Passwords do not match" },
        ],
      }
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setServerError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-headline-md text-headline-md text-primary mb-1">Create account</h2>
      <p className="text-sm text-on-surface-variant mb-6">Register as a patient</p>

      {serverError && (
        <div className="bg-surface-container-low border border-error/30 text-error text-sm px-4 py-3 rounded-xl mb-4">{serverError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          error={errors.name}
          required
          placeholder="John Doe"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
          error={errors.email}
          required
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "", confirmPassword: "" })); }}
          error={errors.password}
          required
          placeholder="Min. 8 characters"
          minLength={8}
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
          error={errors.confirmPassword}
          required
          placeholder="Re-enter password"
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-on-surface-variant mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-primary-700 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
