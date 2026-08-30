import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export default function Textarea({ label, error, className = "", ...props }: Props) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-on-surface-variant">{label}</label>}
      <textarea
        className={`w-full px-4 py-3 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-tertiary-container/30 focus:border-tertiary-container ${error ? "border-error" : ""} ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}