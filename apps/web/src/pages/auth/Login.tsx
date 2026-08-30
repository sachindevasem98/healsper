import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { validate, rules } from "../../lib/validate";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const fieldErrors = validate(
      { email, password },
      {
        email: [rules.required("Email"), rules.email()],
        password: [rules.required("Password")],
      }
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await login(email, password);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const routes = { PATIENT: "/dashboard", DOCTOR: "/doctor", ADMIN: "/admin" };
      navigate(routes[user.role as keyof typeof routes] || "/");
    } catch (err: any) {
      setServerError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-headline-md text-headline-md text-primary mb-1">Welcome back</h2>
      <p className="text-sm text-on-surface-variant mb-6">Sign in to your account</p>

      {serverError && (
        <div className="bg-surface-container-low border border-error/30 text-error text-sm px-4 py-3 rounded-xl mb-4">{serverError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
          error={errors.password}
          required
          placeholder="Enter password"
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-sm text-on-surface-variant mt-6 text-center">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary-700 font-medium hover:underline">Register</Link>
      </p>
    </div>
  );
}
