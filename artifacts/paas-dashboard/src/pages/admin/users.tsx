import { useState, useEffect, useMemo } from "react";
import {
  useAdminListUsers, useAdminGetUser, useAdminDeleteUser,
  useAdminUpdateUser, useAdminAdjustCredits,
  getAdminListUsersQueryKey, getAdminGetUserQueryKey,
} from "@workspace/api-client-react";
import type { UserWithStats } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Users, ShieldAlert, User, Eye, Trash2, Wallet,
  Box, Calendar, Clock, Mail, AlertTriangle, Plus, Minus, Loader2,
  Pencil, Sparkles, Ban, ShieldCheck, Search, ChevronLeft, ChevronRight
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  return { name: "Hobby", color: "rgb(82,97,115)" };
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
          : { background: "#f8fbff", color: "rgb(82,97,115)", border: "1px solid #dbe8f3" }
      }
    >
      {isAdmin ? <ShieldAlert className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function isUserBanned(user: UserWithStats): boolean {
  if (!user.bannedAt) return false;
  if (!user.bannedUntil) return true;
  return new Date() < new Date(user.bannedUntil);
}

function BanBadge({ user }: { user: UserWithStats }) {
  if (!isUserBanned(user)) return null;
  const isPermanent = !user.bannedUntil;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: "rgba(239,68,68,0.12)", color: "rgb(220,38,38)", border: "1px solid rgba(239,68,68,0.22)" }}
    >
      <Ban className="h-2.5 w-2.5" />
      {isPermanent ? "Banned" : "Suspended"}
    </span>
  );
}

function BanUserDialog({
  user, open, onClose, onBanned,
}: {
  user: UserWithStats | null;
  open: boolean;
  onClose: () => void;
  onBanned: () => void;
}) {
  const { toast } = useToast();
  const [duration, setDuration] = useState<string>("7");
  const [reason, setReason] = useState("");

  const banMutation = useMutation({
    mutationFn: async () => {
      const durationDays = duration === "permanent" ? null : Number.parseInt(duration, 10);
      const res = await csrfFetch(`/api/admin/users/${user!.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays, reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal melakukan ban");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Dibanned", description: `${user?.name} berhasil ditangguhkan.` });
      onBanned();
      onClose();
      setReason("");
      setDuration("7");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    },
  });

  useEffect(() => {
    if (open) { setReason(""); setDuration("7"); banMutation.reset(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !banMutation.isPending) onClose(); }}>
      <DialogContent className="max-w-md border-[#dbe8f3] bg-white text-[#172033]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-4 w-4" /> Suspend Pengguna
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <UserAvatar name={user.name} size="sm" />
            <span className="truncate">{user.name} – {user.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Durasi Penangguhan</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hari</SelectItem>
                <SelectItem value="3">3 Hari</SelectItem>
                <SelectItem value="7">7 Hari</SelectItem>
                <SelectItem value="14">14 Hari</SelectItem>
                <SelectItem value="30">30 Hari</SelectItem>
                <SelectItem value="90">90 Hari</SelectItem>
                <SelectItem value="permanent">Permanen (Selamanya)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Alasan (Opsional)</Label>
            <Textarea
              placeholder="Cth: Penyalahgunaan API, tidak membayar tagihan, dll."
              className="min-h-[80px] text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Efek dari ban ini:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>User tidak bisa login ke dashboard</li>
              <li>Semua API AI key milik user akan ditolak</li>
              <li>Semua hosting/web milik user akan dihentikan (DOWN)</li>
              <li>Sesi aktif akan dihancurkan seketika</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={banMutation.isPending}>Batal</Button>
          <Button
            variant="destructive"
            onClick={() => banMutation.mutate()}
            disabled={banMutation.isPending}
          >
            {banMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : <><Ban className="mr-2 h-4 w-4" /> Konfirmasi Ban</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#edf4fb] py-3 last:border-0">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#dbe8f3] bg-[#f8fbff]">
        <Icon className="h-4 w-4 text-[#526173]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="mb-0.5 text-xs text-[#526173]">{label}</p>
        <div className="text-sm font-medium text-[#172033]">{value}</div>
      </div>
    </div>
  );
}

/** Modal untuk mengedit kredit, role, dan plan seorang pengguna. */
function EditUserDialog({
  user, open, onClose, onSaved,
}: {
  user: UserWithStats | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState<string>("user");
  const [plan, setPlan] = useState<string>("hobby");

  const adjustMutation = useAdminAdjustCredits();
  const updateMutation = useAdminUpdateUser();

  // Sinkronkan form tiap kali user berganti / modal dibuka.
  useEffect(() => {
    if (user) {
      setRole(user.role);
      setPlan(user.plan);
      setAmount("");
      setNote("");
      adjustMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, open]);

  if (!user) return null;

  const parsed = Number.parseInt(amount, 10);
  const hasAmount = amount.trim() !== "" && !Number.isNaN(parsed) && parsed !== 0;
  const roleChanged = role !== user.role;
  const planChanged = plan !== user.plan;
  const hasChanges = hasAmount || roleChanged || planChanged;

  const busy = adjustMutation.isPending || updateMutation.isPending;
  const errorMsg =
    (adjustMutation.error as any)?.error ??
    (updateMutation.error as any)?.error ??
    null;

  // Preview saldo setelah penyesuaian.
  const previewCredits = hasAmount ? user.credits + parsed : user.credits;

  async function handleSave() {
    if (!user || !hasChanges) return;
    try {
      // 1) Role / plan
      if (roleChanged || planChanged) {
        await updateMutation.mutateAsync({
          id: user.id,
          data: {
            ...(roleChanged ? { role: role as "user" | "admin" } : {}),
            ...(planChanged ? { plan: plan as "hobby" | "pro" | "team" } : {}),
          },
        });
      }
      // 2) Adjust kredit
      if (hasAmount) {
        await adjustMutation.mutateAsync({
          id: user.id,
          data: { amount: parsed, note: note.trim() || undefined },
        });
      }
      onSaved();
      onClose();
    } catch {
      // error ditampilkan lewat errorMsg; modal tetap terbuka
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="max-w-md border-[#dbe8f3] bg-white text-[#172033]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Pengguna
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <UserAvatar name={user.name} size="sm" />
            <span className="truncate">{user.name} - {user.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Role + Plan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Plan
              </label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hobby">Hobby</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Credit adjust */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Penyesuaian Kredit
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="mis. 10000 atau -5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-sm"
              />
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  title="Positif (tambah)"
                  onClick={() => setAmount((a) => String(Math.abs(Number.parseInt(a, 10) || 0) || ""))}
                  className="h-9 w-9 rounded-md flex items-center justify-center border border-border/60 text-emerald-500 hover:bg-emerald-500/10"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Negatif (kurangi)"
                  onClick={() => setAmount((a) => { const n = Math.abs(Number.parseInt(a, 10) || 0); return n ? String(-n) : ""; })}
                  className="h-9 w-9 rounded-md flex items-center justify-center border border-border/60 text-destructive hover:bg-destructive/10"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Input
              placeholder="Catatan (opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Saldo saat ini:{" "}
              <span className="font-semibold" style={{ color: creditColor(user.credits) }}>{formatCredits(user.credits)}</span>
              {hasAmount && (
                <>
                  {" -> "}
                  <span className="font-semibold" style={{ color: creditColor(previewCredits) }}>{formatCredits(previewCredits)}</span>
                </>
              )}
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg px-3 py-2 text-xs text-destructive" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {errorMsg}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Batal</Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || busy}
            className="bg-primary hover:bg-primary/90"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailSheet({ userId, open, onClose }: { userId: number | null; open: boolean; onClose: () => void }) {
  const { data: user, isLoading } = useAdminGetUser(userId ?? 0);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto border-l border-[#dbe8f3] bg-white text-[#172033]">
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
            <div className="mb-6 flex items-center gap-4 rounded-lg border border-[#dbe8f3] bg-[#f8fbff] p-4">
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
  const { data: users, isLoading } = useAdminListUsers({
    query: { queryKey: getAdminListUsersQueryKey(), refetchInterval: 5000 },
  });
  const deleteMutation = useAdminDeleteUser();

  const { toast } = useToast();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<UserWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [banTarget, setBanTarget] = useState<UserWithStats | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let list = users;

    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
    }

    if (roleFilter !== "all") {
      list = list.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== "all") {
      if (statusFilter === "banned") list = list.filter(u => isUserBanned(u));
      else if (statusFilter === "active") list = list.filter(u => !isUserBanned(u));
    }

    return list;
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);



  const unbanMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await csrfFetch(`/api/admin/users/${id}/unban`, { method: "POST" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal unban"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Di-Unban", description: "Pengguna berhasil dipulihkan." });
      invalidateUsers();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Unban", description: err.message });
    },
  });

  function invalidateUsers(id?: number) {
    queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
    if (id != null) queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(id) });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        invalidateUsers();
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Pengguna</h1>
          <p className="mt-1 text-sm text-[#526173]">Semua akun yang terdaftar di platform.</p>
        </div>
        {users && (
          <div className="rounded-full border border-[#dbe8f3] bg-white px-4 py-2 text-sm font-bold text-[#526173] shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            {users.length} pengguna
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input 
            placeholder="Cari nama atau email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-[#dbe8f3]"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px] h-10 border-[#dbe8f3]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Role</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-10 border-[#dbe8f3]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)]">
        {/* Table header */}
        <div
          className="grid border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#526173]"
          style={{ gridTemplateColumns: "1fr 80px 110px 140px 120px" }}
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
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Tidak ada pengguna yang cocok dengan filter.</p>
          </div>
        ) : (
          <div>
            {paginatedUsers.map((user) => (
              <div
                key={user.id}
                className="grid items-center border-b border-[#edf4fb] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[#f8fbff]"
                style={{
                  gridTemplateColumns: "1fr 80px 110px 140px 120px",
                }}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={user.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#172033]">{user.name}</p>
                      <BanBadge user={user} />
                    </div>
                    <p className="truncate text-xs text-[#526173]">{user.email}</p>
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
                  <span className="text-xs text-[#526173]">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: idLocale })
                      : "-"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setDetailId(user.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[#526173] transition-colors hover:bg-[#eef8ff] hover:text-[#172033]"
                    title="Lihat detail"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditTarget(user)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Edit (kredit, role, plan)"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isUserBanned(user) ? (
                    <button
                      onClick={() => unbanMutation.mutate(user.id)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Unban / Pulihkan"
                      disabled={unbanMutation.isPending}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </button>
                  ) : user.role !== "admin" ? (
                    <button
                      onClick={() => setBanTarget(user)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Suspend / Ban"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
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

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[#526173]">
          <p>
            Menampilkan <span className="font-semibold text-[#172033]">{(page - 1) * itemsPerPage + 1}</span> hingga{" "}
            <span className="font-semibold text-[#172033]">{Math.min(page * itemsPerPage, filteredUsers.length)}</span> dari{" "}
            <span className="font-semibold text-[#172033]">{filteredUsers.length}</span> pengguna
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 border-[#dbe8f3] text-[#526173]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="px-2 text-xs font-semibold">
              {page} / {totalPages}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 border-[#dbe8f3] text-[#526173]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail sheet (read-only) */}
      <UserDetailSheet
        userId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />

      {/* Edit modal */}
      {/* Ban dialog */}
      <BanUserDialog
        user={banTarget}
        open={banTarget !== null}
        onClose={() => setBanTarget(null)}
        onBanned={() => invalidateUsers(banTarget?.id)}
      />

      <EditUserDialog
        user={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSaved={() => invalidateUsers(editTarget?.id)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-[#dbe8f3] bg-white text-[#172033]">
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
