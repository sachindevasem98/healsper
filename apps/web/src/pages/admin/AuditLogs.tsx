import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import type { AuditLog } from "../../lib/types";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await api.getAuditLogsPage(p, 20);
      setLogs(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  return (
    <div className="space-y-6">
      <h1 className="font-headline-md text-headline-md text-primary">Audit Logs</h1>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState title="No audit logs yet" />
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{log.action}</p>
                    <p className="text-xs text-on-surface-variant">Entity: {log.entity}{log.entityId ? ` (${log.entityId.slice(0, 8)}...)` : ""}</p>
                    {log.user && <p className="text-xs text-on-surface-variant">By: {log.user.name} ({log.user.email})</p>}
                  </div>
                  <p className="text-xs text-on-surface-variant shrink-0">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}