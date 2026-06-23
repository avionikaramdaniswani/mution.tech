import { useState } from "react";
import { useAdminListUsers, useAdminGetUser, useAdminDeleteUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users, ShieldAlert, User, Eye, Trash2, Wallet,
  Box, Calendar, Clock, Mail, X, AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function formatCredits(c: number) {
  return "Rp " + c.toLocaleString("id-ID");
}

function creditColor(c: number): string {
  if (c === 0) return "rgb(239,68,68)";
  if (c <= 1000) return "rgb(234,179,8)";
  return "rgb(34,197,94)";
}

function planStyle(plan?: string) {
  if (plan === "team") return { name: "Team", color: "rgba(139,92,246,0.8)" };
  if (plan === "pro")  return { name: "Pro",  color: "rgb(249,115,22)" };
  return { name: "Hobby", color: "rgba(255,255,255,0.4)" };
}

function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const dim = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: "rgba(249,115,22,0.15)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.25)" }}
    >
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={
        isAdmin
          ? { background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)", border: "1px solid rgba(239,68,68,0.22)" }
          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
      }
    >
      {isAdmin ? <ShieldAlert className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="mt-0.5 flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function UserDetailSheet({ userId, open, onClose }: { userId: number | null; open: boolean; onClose: () => void }) {
  const { data: user, isLoading } = useAdminGetUser(userId ?? 0);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-sm dark bg-background border-l border-border/50 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-base">Detail Pengguna</SheetTitle>
        </SheetHeader>

        {isLoading || !user ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <div>
            {/* Avatar + identity */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <UserAvatar name={user.name} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-base truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="mt-2">
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>

            {/* Stats rows */}
            <DetailRow
              icon={Wallet}
              label="Saldo Kredit"
              value={
                <span style={{ color: creditColor(user.credits) }}>
                  {formatCredits(user.credits)}
                  <span className="ml-2 text-xs font-semibold" style={{ color: planStyle(user.plan).color }}>
                    {planStyle(user.plan).name}
                  </span>
                </span>
              }
            />
            <DetailRow
              icon={Box}
              label="Jumlah Proyek"
              value={`${user.projectCount} proyek`}
            />
            <DetailRow
              icon={Mail}
              label="Email"
              value={<span className="break-all">{user.email}</span>}
            />
            <DetailRow
              icon={Calendar}
              label="Bergabung"
              value={format(new Date(user.createdAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}
            />
            <DetailRow
              icon={Clock}
              label="Login Terakhir"
              value={
                user.lastLoginAt
                  ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: idLocale })
                  : <span className="text-muted-foreground">Belum pernah login</span>
              }
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useAdminListUsers();
  const deleteMutation = useAdminDeleteUser();

  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/admin/users"] });
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground mt-1">Semua akun yang terdaftar di platform.</p>
        </div>
        {users && (
          <div
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            {users.length} pengguna
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Table header */}
        <div
          className="grid px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: "1fr 80px 110px 140px 88px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>Pengguna</div>
          <div className="text-center">Role</div>
          <div className="text-right">Saldo</div>
          <div className="text-right">Login Terakhir</div>
          <div className="text-right">Aksi</div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada pengguna.</p>
          </div>
        ) : (
          <div>
            {users.map((user, i) => (
              <div
                key={user.id}
                className="grid items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                style={{
                  gridTemplateColumns: "1fr 80px 110px 140px 88px",
                  borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={user.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex justify-center">
                  <RoleBadge role={user.role} />
                </div>

                {/* Credits */}
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums" style={{ color: creditColor(user.credits) }}>
                    {formatCredits(user.credits)}
                  </span>
                </div>

                {/* Last login */}
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: idLocale })
                      : "—"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setDetailId(user.id)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                    title="Lihat detail"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Hapus akun"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <UserDetailSheet
        userId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="dark bg-background border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Hapus Akun Pengguna
            </AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong className="text-foreground">{deleteTarget?.name}</strong> akan dihapus permanen beserta semua datanya.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
