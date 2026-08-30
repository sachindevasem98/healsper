import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary-800 to-tertiary-container" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-tertiary-container opacity-30 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-secondary-container opacity-20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <img src="/helsper.png" alt="Healsper" className="w-12 h-12 object-contain rounded-full shadow-lg" />
            <h1 className="font-headline-md text-headline-md font-bold text-surface-container-lowest">Healsper</h1>
          </div>
          <p className="text-sm mt-2 text-surface-container-low/80">Healthcare Appointment System</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-8 animate-slide-up">
          <Outlet />
        </div>
      </div>
    </div>
  );
}