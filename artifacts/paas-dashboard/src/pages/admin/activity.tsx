import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpCircle, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api-fetch";

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
    "admin.user.deleted": "Admin: hapus user",
  };
  return map[action] ?? action;
}

interface AdminActivityLog {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  projectId: number | null;
  projectName: string | null;
  action: string;
  metadata: any;
  createdAt: string;
}

export default function AdminActivity() {
  const { data: logs, isLoading } = useQuery<AdminActivityLog[]>({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/activity");
      if (!res.ok) throw new Error("Gagal mengambil log");
      return res.json();
    }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-[#526173]">Rekam jejak aksi dari semua pengguna di platform.</p>
      </div>

      {/* Log list */}
      <div className="overflow-x-auto rounded-lg border border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#dbe8f3] bg-[#f8fbff] text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#526173]">
              <th className="px-5 py-3">Pengguna</th>
              <th className="px-5 py-3">Aksi</th>
              <th className="px-5 py-3">Metadata</th>
              <th className="px-5 py-3 text-right">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf4fb]">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-5 py-4"><Skeleton className="h-7 w-full" /></td>
                </tr>
              ))
            ) : !logs || logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Activity className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                let meta = "";
                try { meta = log.metadata ? JSON.stringify(typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : ""; } catch { meta = log.metadata ?? ""; }
                const isAdmin = log.action.startsWith("admin.");
                return (
                  <tr key={log.id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="px-5 py-3.5 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f5fa] text-[#526173]">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#172033]">{log.userName}</p>
                          <p className="truncate text-xs text-[#64748b]">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={isAdmin ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)" } : { background: "#f8fbff", border: "1px solid #dbe8f3" }}
                        >
                          <ArrowUpCircle className="h-3 w-3" style={{ color: isAdmin ? "rgb(239,68,68)" : "rgb(82,97,115)" }} />
                        </div>
                        <p className="truncate font-medium text-[#172033]">{actionLabel(log.action)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 min-w-[200px]">
                      <p className="truncate text-xs font-mono text-[#526173]">{meta || "-"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs text-[#526173]">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
