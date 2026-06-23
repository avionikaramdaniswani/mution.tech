import { useListActivity } from "@workspace/api-client-react";
import { Activity, ArrowUpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

function actionLabel(action: string) {
  const map: Record<string, string> = {
    "project.created": "Membuat proyek",
    "project.deleted": "Menghapus proyek",
    "project.stopped": "Menghentikan proyek",
    "project.restarted": "Merestart proyek",
    "deployment.triggered": "Memicu deployment",
    "deployment.rolledback": "Rollback deployment",
    "admin.project.stopped": "Admin: hentikan proyek",
    "admin.project.deleted": "Admin: hapus proyek",
    "env_var.created": "Tambah env var",
    "env_var.deleted": "Hapus env var",
    "database.provisioned": "Provisioning database",
  };
  return map[action] ?? action;
}

export default function AdminActivity() {
  const { data: logs, isLoading } = useListActivity();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Log Aktivitas</h1>
        <p className="text-sm text-muted-foreground mt-1">Rekam jejak aksi yang terjadi di platform.</p>
      </div>

      {/* Log list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Header row */}
        <div
          className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="col-span-5">Aksi</div>
          <div className="col-span-4">Metadata</div>
          <div className="col-span-3 text-right">Waktu</div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-7 w-full" />
              </div>
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
          </div>
        ) : (
          <div>
            {logs.map((log, i) => {
              let meta = "";
              try { meta = log.metadata ? JSON.stringify(JSON.parse(log.metadata)) : ""; } catch { meta = log.metadata ?? ""; }
              const isAdmin = log.action.startsWith("admin.");
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-12 items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: i < logs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={
                        isAdmin
                          ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" }
                          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      <ArrowUpCircle
                        className="h-3 w-3"
                        style={{ color: isAdmin ? "rgb(239,68,68)" : "rgba(255,255,255,0.4)" }}
                      />
                    </div>
                    <p className="text-sm truncate">{actionLabel(log.action)}</p>
                  </div>
                  <div className="col-span-4 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{meta || "—"}</p>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
