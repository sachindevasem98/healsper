import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  options: string[];
};

export default function ComboSelect({ label, error, options, className = "", id, ...props }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const listId = `${inputId}-list`;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        id={inputId}
        list={listId}
        className={`w-full h-12 px-4 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-tertiary-container/30 focus:border-tertiary-container disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-error" : ""} ${className}`}
        {...props}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}