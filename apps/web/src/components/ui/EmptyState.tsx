import type { ReactNode } from "react";

type Props = {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ icon = "inbox", title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="material-symbols-outlined text-4xl text-outline/50 mb-3">{icon}</span>
      <h3 className="text-sm font-medium text-on-surface">{title}</h3>
      {description && <p className="text-xs text-on-surface-variant mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}