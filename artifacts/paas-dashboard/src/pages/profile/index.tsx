import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, ShieldCheck, KeyRound } from "lucide-react";

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Konfirmasi password tidak cocok.");
      return;
    }
    setPwSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">Informasi akun dan pengaturan keamanan.</p>
      </div>

      {/* Card: info akun */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Avatar header */}
        <div
          className="px-6 pt-8 pb-6 flex items-center gap-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.25)",
              color: "rgb(249,115,22)",
            }}
          >
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span
              className="inline-flex mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={
                user?.role === "admin"
                  ? { background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)", border: "1px solid rgba(239,68,68,0.2)" }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }
              }
            >
              {user?.role === "admin" ? "Admin" : "User"}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-6">
          <InfoRow icon={User}        label="Nama"  value={user?.name} />
          <InfoRow icon={Mail}        label="Email" value={user?.email} />
          <InfoRow icon={ShieldCheck} label="Role"  value={user?.role === "admin" ? "Administrator" : "Regular User"} />
        </div>
      </div>

      {/* Card: ganti password */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Ganti Password</p>
        </div>

        <form onSubmit={handleChangePassword} className="px-6 py-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw" className="text-xs text-muted-foreground">Password saat ini</Label>
            <Input
              id="current-pw"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw" className="text-xs text-muted-foreground">Password baru</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="Min. 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw" className="text-xs text-muted-foreground">Konfirmasi password</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {pwError && (
            <p className="text-xs text-destructive">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="text-xs text-emerald-500">Password berhasil diperbarui.</p>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm">Simpan Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
