import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { useSocket } from "../../lib/socket";
import type { Notification } from "../../lib/types";

export default function NotificationBell() {
  const { toast } = useToast();
  const { connected, on } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    api.getMyNotifications(1, 10, true).then((data) => {
      const items = Array.isArray(data) ? data : [];
      setNotifications(items);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refresh instantly when the backend broadcasts a new notification (e.g. admin
  // team alerted about a doctor's schedule change).
  useEffect(() => {
    if (!connected) return;
    return on("notification:created", fetchNotifications);
  }, [connected, on, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Unread = anything still present locally that the user hasn't explicitly opened.
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markRead = async (id: string) => {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    try {
      await api.markNotificationRead(id);
    } catch {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications([]);
      setReadIds(new Set());
      toast("All notifications marked as read", "success");
    } catch {
      toast("Failed to mark notifications as read", "error");
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-low"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-lg">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 z-50 animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
            <h3 className="text-sm font-semibold text-on-surface">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-6">No unread notifications</p>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-outline-variant/20 cursor-pointer flex gap-2.5 transition-colors ${
                      isRead ? "bg-white hover:bg-surface-container-low" : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 transition-opacity ${isRead ? "opacity-0" : "bg-primary"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm transition-colors ${isRead ? "font-normal text-on-surface-variant" : "font-semibold text-on-surface"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5 break-words whitespace-normal">{n.message}</p>
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}