type Rule = { test: (v: string) => boolean; message: string };
type FieldRules = Record<string, Rule[]>;

export function validate(fields: Record<string, string>, rules: FieldRules): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    const val = fields[field] ?? "";
    for (const rule of fieldRules) {
      if (!rule.test(val)) {
        errors[field] = rule.message;
        break;
      }
    }
  }
  return errors;
}

export const rules = {
  required: (label: string): Rule => ({
    test: (v) => v.trim().length > 0,
    message: `${label} is required`,
  }),
  email: (): Rule => ({
    test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: "Enter a valid email address",
  }),
  minLength: (n: number): Rule => ({
    test: (v) => v.length >= n,
    message: `Must be at least ${n} characters`,
  }),
  maxLength: (n: number): Rule => ({
    test: (v) => v.length <= n,
    message: `Must be at most ${n} characters`,
  }),
  numeric: (): Rule => ({
    test: (v) => /^\d+(\.\d+)?$/.test(v),
    message: "Must be a number",
  }),
  positive: (): Rule => ({
    test: (v) => parseFloat(v) > 0,
    message: "Must be greater than 0",
  }),
};
