import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 transition-colors ${
    isActive
      ? "text-on-surface font-semibold bg-surface-container-high"
      : "text-on-surface-variant hover:bg-surface-container-high"
  }`;

export default function PublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const recordsPath = () => {
    if (!user) return "/login";
    if (user.role === "DOCTOR") return "/doctor";
    if (user.role === "ADMIN") return "/admin";
    return "/records";
  };

  const handleBook = () => {
    if (user && user.role === "PATIENT") navigate("/doctors");
    else navigate("/login");
  };

  const handlePerson = () => {
    if (user) navigate("/profile");
    else navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background pb-24 md:pb-0">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant shadow-sm flex items-center justify-between px-margin-mobile md:px-margin-desktop h-20">
        <Link to="/" className="flex items-center gap-3">
          <img src="/helsper.png" alt="Healsper" className="w-10 h-10 object-contain rounded-lg" />
          <h1 className="text-headline-md font-headline-md font-bold text-primary">Healsper</h1>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8 items-center">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/doctors" className={navLinkClass}>
            Specialties
          </NavLink>
          <NavLink to={recordsPath()} className={navLinkClass}>
            My Records
          </NavLink>
          <button
            onClick={handleBook}
            className="bg-secondary-container text-on-secondary-container font-label-md text-label-md px-6 py-3 rounded-full hover:bg-secondary-fixed transition-colors"
          >
            Book Appointment
          </button>
        </nav>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-3">
          <a
            href="tel:1066"
            className="bg-error-container text-on-error-container p-2 rounded-full font-label-md flex items-center gap-1 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">call</span>
            1066
          </a>
          <button
            onClick={handlePerson}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full"
            aria-label="Account"
          >
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-primary text-on-primary mt-auto hidden md:block">
        <div className="max-w-container-max mx-auto px-margin-desktop py-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/helsper.png" alt="Healsper" className="w-10 h-10 object-contain rounded-full" />
              <span className="text-headline-sm font-headline-sm font-bold">Healsper</span>
            </div>
            <p className="text-sm mt-3 max-w-md opacity-80">
              Find care you trust. Connecting patients with specialists, appointments and care records in one place.
            </p>
          </div>
          <div className="flex gap-8">
            <Link to="/" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
              Home
            </Link>
            <Link to="/doctors" className="text-sm opacity-80 hover:opacity-100 transition-opacity">
              Specialties
            </Link>
            <Link to={recordsPath()} className="text-sm opacity-80 hover:opacity-100 transition-opacity">
              My Records
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-xs py-4 opacity-60">
          © {new Date().getFullYear()} Healsper Healthcare · Emergency line 1066
        </div>
      </footer>

      {/* BottomNavBar (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-2 pb-4 px-2 bg-surface-container-lowest shadow-[0_-4px_12px_rgba(0,64,82,0.05)] rounded-t-xl">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all duration-200 ${
              isActive
                ? "bg-secondary-container text-on-secondary-container"
                : "text-outline hover:text-primary"
            }`
          }
        >
          <span className="material-symbols-outlined">home</span>
          <span className="font-label-md text-label-md mt-1 text-[10px]">Home</span>
        </NavLink>
        <NavLink
          to="/doctors"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-4 py-1 transition-all duration-200 ${
              isActive ? "text-primary" : "text-outline hover:text-primary"
            }`
          }
        >
          <span className="material-symbols-outlined">medical_services</span>
          <span className="font-label-md text-label-md mt-1 text-[10px]">Specialties</span>
        </NavLink>
        <a
          href="tel:1066"
          className="flex flex-col items-center justify-center px-4 py-1 text-outline hover:text-primary transition-all duration-200"
        >
          <span className="material-symbols-outlined">emergency</span>
          <span className="font-label-md text-label-md mt-1 text-[10px]">Emergency</span>
        </a>
        <NavLink
          to={recordsPath()}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-4 py-1 transition-all duration-200 ${
              isActive ? "text-primary" : "text-outline hover:text-primary"
            }`
          }
        >
          <span className="material-symbols-outlined">assignment</span>
          <span className="font-label-md text-label-md mt-1 text-[10px]">My Records</span>
        </NavLink>
      </nav>
    </div>
  );
}