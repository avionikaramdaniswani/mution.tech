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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-[#526173]">Rekam jejak aksi yang terjadi di platform.</p>
      </div>

      {/* Log list */}
      <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)]">
        {/* Header row */}
        <div className="grid grid-cols-12 border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#526173]">
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
            {logs.map((log) => {
              let meta = "";
              try { meta = log.metadata ? JSON.stringify(JSON.parse(log.metadata)) : ""; } catch { meta = log.metadata ?? ""; }
              const isAdmin = log.action.startsWith("admin.");
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-12 items-center border-b border-[#edf4fb] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[#f8fbff]"
                >
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={
                        isAdmin
                          ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" }
                          : { background: "#f8fbff", border: "1px solid #dbe8f3" }
                      }
                    >
                      <ArrowUpCircle
                        className="h-3 w-3"
                        style={{ color: isAdmin ? "rgb(239,68,68)" : "rgb(82,97,115)" }}
                      />
                    </div>
                    <p className="truncate text-sm font-medium text-[#172033]">{actionLabel(log.action)}</p>
                  </div>
                  <div className="col-span-4 min-w-0">
                    <p className="truncate text-xs text-[#526173]">{meta || "-"}</p>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-xs text-[#526173]">
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
