const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CHECKED_IN: "bg-indigo-100 text-indigo-800",
  WAITING: "bg-orange-100 text-orange-800",
  IN_CONSULTATION: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RESCHEDULED: "bg-gray-100 text-gray-800",
  NO_SHOW: "bg-red-100 text-red-800",
  WAITING_queue: "bg-orange-100 text-orange-800",
  CALLED: "bg-blue-100 text-blue-800",
  SERVED: "bg-green-100 text-green-800",
  SKIPPED: "bg-gray-100 text-gray-800",
};

export default function Badge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-surface-container text-on-surface-variant";
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}