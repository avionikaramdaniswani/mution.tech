import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpCircle, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    "admin.user.updated": "Admin: update user",
    "admin.user.credits_adjusted": "Admin: sesuaikan saldo",
    "apikey.created": "Membuat API Key",
    "apikey.updated": "Mengubah API Key",
    "apikey.deleted": "Menghapus API Key",
    "user.registered": "Mendaftar akun",
    "user.login": "Login",
    "user.password_reset": "Reset password",
    "user.password_changed": "Mengubah password",
    "billing.topup_created": "Membuat tagihan topup",
    "billing.topup_paid": "Membayar topup",
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
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: logs, isLoading } = useQuery<AdminActivityLog[]>({
    queryKey: ["admin-activity"],
    queryFn: () => apiFetch("/admin/activity")
  });

  const totalPages = Math.max(1, Math.ceil((logs?.length ?? 0) / itemsPerPage));
  const paginatedLogs = logs?.slice((page - 1) * itemsPerPage, page * itemsPerPage) ?? [];

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
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Activity className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
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

      {/* Pagination Controls */}
      {logs && logs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#526173]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="whitespace-nowrap">Tampilkan:</span>
            <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setPage(1); }}>
              <SelectTrigger className="h-8 w-16 border-[#dbe8f3] px-2 py-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="whitespace-nowrap ml-2">
              Menampilkan <span className="font-semibold text-[#172033]">{(page - 1) * itemsPerPage + 1}</span> hingga{" "}
              <span className="font-semibold text-[#172033]">{Math.min(page * itemsPerPage, logs.length)}</span> dari{" "}
              <span className="font-semibold text-[#172033]">{logs.length}</span> aktivitas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 border-[#dbe8f3]"
            >
              Sebelumnnya
            </Button>
            <span className="px-2 font-medium">
              Hal {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 border-[#dbe8f3]"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
