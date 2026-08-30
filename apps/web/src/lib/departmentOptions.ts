export type DepartmentFieldOptions = { specializations: string[]; qualifications: string[] };

export const DEPARTMENT_OPTIONS: Record<string, DepartmentFieldOptions> = {
  "Cardiology": {
    specializations: ["Cardiology", "Interventional Cardiology", "Pediatric Cardiology", "Electrophysiology"],
    qualifications: ["MBBS", "MD", "DM - Cardiology", "DNB Cardiology"],
  },
  "Oncology": {
    specializations: ["Medical Oncology", "Surgical Oncology", "Radiation Oncology"],
    qualifications: ["MD", "DM - Oncology", "MCh"],
  },
  "Neurology": {
    specializations: ["Neurology", "Interventional Neurology", "Neurocritical Care"],
    qualifications: ["MBBS", "MD", "DM - Neurology"],
  },
  "General Medicine": {
    specializations: ["General Medicine", "Internal Medicine", "Family Medicine"],
    qualifications: ["MBBS", "MD"],
  },
  "Pediatrics": {
    specializations: ["Pediatrics", "Neonatology", "Pediatric Critical Care"],
    qualifications: ["MBBS", "MD", "DNB Pediatrics"],
  },
  "Dermatology": {
    specializations: ["Dermatology", "Cosmetic Dermatology", "Dermatopathology"],
    qualifications: ["MBBS", "MD", "DNB Dermatology"],
  },
  "*": {
    specializations: ["General Medicine"],
    qualifications: ["MBBS", "MD"],
  },
};

export function getDepartmentOptions(departmentName: string | undefined): DepartmentFieldOptions {
  if (!departmentName) return { specializations: [], qualifications: [] };
  return DEPARTMENT_OPTIONS[departmentName] || DEPARTMENT_OPTIONS["*"];
}