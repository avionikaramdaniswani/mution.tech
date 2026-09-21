import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, ShieldCheck, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function InfoRow({ icon: Icon, label, value, isLast = false }: { icon: any; label: string; value?: string, isLast?: boolean }) {
  return (
    <div className={`flex items-start gap-4 py-4 ${!isLast ? 'border-b border-border/50' : ''}`}>
      <div className="mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5 font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value ?? "-"}</p>
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const initials = (user?.name ?? "x")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleChangePassword = async (e: React.FormEvent) => {
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
    try {
      setIsChangingPassword(true);
      await apiFetch("/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Gagal memperbarui password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Profil Akun</h1>
        <p className="text-muted-foreground mt-2">Kelola informasi personal dan pengaturan keamanan akun Anda.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_1fr] items-start">
        <div className="space-y-8">
          <Card className="border-border/50 shadow-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            <CardContent className="p-0 relative">
              <div className="px-6 pt-8 pb-6 flex items-center gap-5 border-b border-border/50 bg-muted/20">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold bg-primary/10 text-primary border border-primary/20 shadow-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-xl font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
                  <Badge variant={user?.role === "admin" ? "destructive" : "secondary"} className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5">
                    {user?.role === "admin" ? "Administrator" : "User"}
                  </Badge>
                </div>
              </div>
              <div className="px-6 py-2">
                <InfoRow icon={User} label="Nama Lengkap" value={user?.name} />
                <InfoRow icon={Mail} label="Alamat Email" value={user?.email} />
                <InfoRow icon={ShieldCheck} label="Tipe Akun" value={user?.role === "admin" ? "Administrator" : "Regular User"} isLast={true} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 flex-shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Keamanan Akun</CardTitle>
                  <CardDescription>Perbarui password Anda secara berkala.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-pw" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password Saat Ini</Label>
                  <Input
                    id="current-pw"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password Baru</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasi Password Baru</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    placeholder="Ketik ulang password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                  />
                </div>

                {pwError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in zoom-in-95">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in zoom-in-95">
                    <CheckCircle2 className="h-4 w-4" />
                    Password berhasil diperbarui!
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" className="w-full relative overflow-hidden group" disabled={isChangingPassword}>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {isChangingPassword ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </span>
                    ) : (
                      "Simpan Password Baru"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
