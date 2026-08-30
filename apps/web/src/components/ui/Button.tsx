import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-800 shadow-sm",
  secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed",
  outline: "border border-outline-variant text-primary hover:bg-surface-container-low",
  danger: "bg-error text-on-error hover:bg-red-700",
  ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({ variant = "primary", size = "md", className = "", children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}