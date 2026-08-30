import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SPECIALTY_ICONS: Array<[string, string]> = [
  ["cardio", "monitor_heart"],
  ["cardiac", "monitor_heart"],
  ["heart", "favorite"],
  ["oncol", "coronavirus"],
  ["neuro", "psychology"],
  ["gastro", "stomach"],
  ["ortho", "accessible_forward"],
  ["pedia", "child_care"],
  ["derma", "face"],
  ["dental", "dentistry"],
  ["eye", "visibility"],
  ["ent", "hearing"],
  ["general", "stethoscope"],
  ["physio", "rehab"],
  ["gynec", "pregnant_woman"],
  ["psych", "self_improvement"],
];

function iconFor(name: string): string {
  const lower = name.toLowerCase();
  const hit = SPECIALTY_ICONS.find(([key]) => lower.includes(key));
  return hit ? hit[1] : "medical_services";
}

const FALLBACK_SPECIALTIES = [
  "Cardiology",
  "Oncology",
  "Neurology",
  "Gastroenterology",
  "Orthopedics",
  "General Medicine",
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const home = user.role === "PATIENT" ? "/dashboard" : user.role === "DOCTOR" ? "/doctor" : "/admin";
    navigate(home, { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api
      .getDepartments("", 1, 12)
      .then((depts: any[]) => setSpecialties(depts.map((d) => d.name).filter(Boolean)))
      .catch(() => setSpecialties(FALLBACK_SPECIALTIES))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(`/doctors${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const handleBook = () => {
    if (!user || user.role === "PATIENT") navigate("/doctors");
    else if (user.role === "DOCTOR") navigate("/doctor");
    else navigate("/admin");
  };

  const goSpecialty = (name: string) => navigate(`/doctors?q=${encodeURIComponent(name)}`);

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[460px] h-[60vh] flex items-center justify-center px-margin-mobile md:px-margin-desktop overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary-container via-primary-600 to-tertiary-container" />
        <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-tertiary-container opacity-40 blur-3xl z-0" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-secondary-container opacity-20 blur-3xl z-0" />

        <div className="relative z-10 w-full max-w-3xl bg-surface-container-lowest/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-outline-variant/30 text-center mx-4 mt-8 md:mt-0">
          <h2 className="font-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-headline-lg-mobile text-primary mb-4">
            Find Care You Trust
          </h2>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-outline-variant focus:border-tertiary-container focus:ring-1 focus:ring-tertiary-container text-body-md bg-surface"
                placeholder="Search Doctors, Specialties, Hospitals..."
                type="text"
              />
            </div>
            <button
              type="submit"
              className="h-12 bg-secondary-container text-on-secondary-container font-label-md text-label-md px-8 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">manage_search</span>
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Top Specialties */}
      <section className="py-stack-md px-margin-mobile md:px-margin-desktop bg-surface-container-low">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-stack-sm">Top Specialties</h3>
        {loading ? (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-28 h-28 bg-surface-container-highest animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 snap-x">
            {specialties.map((name) => (
              <button
                key={name}
                onClick={() => goSpecialty(name)}
                className="snap-start shrink-0 flex flex-col items-center gap-2 p-4 w-28 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 hover:border-tertiary-container transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-tertiary-container group-hover:text-on-tertiary-container transition-colors">
                  <span className="material-symbols-outlined">{iconFor(name)}</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant text-center capitalize">
                  {name}
                </span>
              </button>
            ))}
            <button
              onClick={() => navigate("/doctors")}
              className="snap-start shrink-0 flex flex-col items-center justify-center gap-2 p-4 w-28 bg-surface-container rounded-xl shadow-sm hover:bg-surface-container-high transition-all text-primary"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
              <span className="font-label-md text-label-md">View All</span>
            </button>
          </div>
        )}
      </section>

      {/* Health Packages */}
      <section className="py-stack-lg px-margin-mobile md:px-margin-desktop bg-surface">
        <h3 className="font-headline-md text-headline-md text-primary mb-stack-md text-center">
          Preventive Health Packages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter max-w-container-max mx-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col relative group hover:shadow-lg transition-shadow">
            <div className="h-2 w-full bg-primary-container" />
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">ProHealth Master</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                Comprehensive full body evaluation for active adults.
              </p>
              <div className="text-primary font-headline-md text-headline-md mb-6">₹8,200/-</div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-tertiary-container text-sm mt-1">check_circle</span>
                  64 Parameters covered
                </li>
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-tertiary-container text-sm mt-1">check_circle</span>
                  Doctor Consultation included
                </li>
              </ul>
              <button
                onClick={handleBook}
                className="w-full py-3 rounded-lg border-2 border-primary-container text-primary-container font-label-md text-label-md hover:bg-primary-container hover:text-on-primary transition-colors"
              >
                Book Now
              </button>
            </div>
          </div>

          <div className="bg-primary-container text-on-primary rounded-2xl shadow-md overflow-hidden flex flex-col relative transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-secondary-container text-on-secondary-container px-4 py-1 rounded-bl-xl font-label-md text-label-md text-xs">
              Popular
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-headline-sm text-headline-sm mb-2">Full Body Checkup</h4>
              <p className="font-body-sm text-body-sm text-on-primary-container mb-4">
                Advanced screening for complete peace of mind.
              </p>
              <div className="text-secondary-fixed font-headline-md text-headline-md mb-6">₹12,500/-</div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-secondary-fixed text-sm mt-1">check_circle</span>
                  85+ Parameters covered
                </li>
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-secondary-fixed text-sm mt-1">check_circle</span>
                  Specialist Consultations
                </li>
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-secondary-fixed text-sm mt-1">check_circle</span>
                  Priority Reporting
                </li>
              </ul>
              <button
                onClick={handleBook}
                className="w-full py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md hover:bg-secondary-fixed transition-colors"
              >
                Book Now
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col relative group hover:shadow-lg transition-shadow">
            <div className="h-2 w-full bg-primary-container" />
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">Healthy Heart</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                Focused cardiac evaluation and risk assessment.
              </p>
              <div className="text-primary font-headline-md text-headline-md mb-6">₹5,400/-</div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-tertiary-container text-sm mt-1">check_circle</span>
                  ECG, Echo &amp; TMT
                </li>
                <li className="flex items-start gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-tertiary-container text-sm mt-1">check_circle</span>
                  Cardiologist Review
                </li>
              </ul>
              <button
                onClick={handleBook}
                className="w-full py-3 rounded-lg border-2 border-primary-container text-primary-container font-label-md text-label-md hover:bg-primary-container hover:text-on-primary transition-colors"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}