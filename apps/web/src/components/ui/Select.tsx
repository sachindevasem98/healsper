import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export default function Select({ label, error, options, placeholder, className = "", ...props }: Props) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-on-surface-variant">{label}</label>}
      <select
        className={`w-full h-12 px-4 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary-container/30 focus:border-tertiary-container ${error ? "border-error" : ""} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}