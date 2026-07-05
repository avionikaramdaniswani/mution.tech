import { useState } from "react";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, Pencil, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  totalTokensUsed: number;
  totalRequestsCount: number;
  totalCreditsUsed: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  creditLimit: number | null;
  allowedModels: string[] | null;
}

interface NewKey extends ApiKey {
  fullKey: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

const AVAILABLE_MODELS = [
  "claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8",
  "claude-sonnet-4-6", "claude-sonnet-4-7", "claude-sonnet-5",
  "gpt-5-4", "gpt-5-5", "glm-5-2"
];

function ResponsivePanel({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (open: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer: React.ReactNode }) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-4 overflow-y-auto">
            {children}
          </div>
          <DrawerFooter className="pt-4 flex-row gap-2">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="py-6">
          {children}
        </div>
        <SheetFooter className="mt-4 flex-col sm:flex-row gap-2">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState("");
  const [newKeyCreditLimit, setNewKeyCreditLimit] = useState("");
  const [newKeyAllowedModels, setNewKeyAllowedModels] = useState<string[]>([]);
  const [newKeyUnlimitedCredit, setNewKeyUnlimitedCredit] = useState(true);

  const [newKeyResult, setNewKeyResult] = useState<NewKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState("");
  const [editAllowedModels, setEditAllowedModels] = useState<string[]>([]);
  const [editUnlimitedCredit, setEditUnlimitedCredit] = useState(true);

  const [showFullKey, setShowFullKey] = useState(false);

  const openCreateDialog = () => {
    setNewKeyName("");
    setNewKeyExpiresAt("");
    setNewKeyCreditLimit("");
    setNewKeyAllowedModels([]);
    setNewKeyUnlimitedCredit(true);
    setShowCreate(true);
  };

  const openEditDialog = (key: ApiKey) => {
    setEditTarget(key);
    setEditName(key.name);
    setEditExpiresAt(key.expiresAt ? new Date(key.expiresAt).toISOString().split('T')[0] : "");
    setEditCreditLimit(key.creditLimit !== null ? String(key.creditLimit) : "");
    setEditUnlimitedCredit(key.creditLimit === null);
    setEditAllowedModels(key.allowedModels || []);
  };

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch("/api-keys"),
  });

  const activeKeys = keys.filter((k) => k.isActive);

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiFetch("/api-keys", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (data: NewKey) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKeyResult(data);
      setShowCreate(false);
      setNewKeyName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch(`/api-keys/${payload.id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setEditTarget(null);
      toast.success("Nama berhasil diubah");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setRevokeTarget(null);
      toast.success("API key berhasil dinonaktifkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate key untuk akses Mution AI API - compatible dengan OpenAI SDK.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Buat Key Baru
        </Button>
      </div>

      {/* Usage info removed - now in docs */}

      {/* Keys list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Key Aktif ({activeKeys.length}/10)
        </h2>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Memuat...</div>
        ) : activeKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 py-12 text-center">
            <Key className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada API key. Buat key pertama kamu!</p>
          </div>
        ) : (
          activeKeys.map((key) => (
            <div
              key={key.id}
              className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{key.name}</span>
                  <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 bg-green-500/10">
                    Aktif
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}</code>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                  <span>{(key.totalRequestsCount || 0).toLocaleString()} reqs</span>
                  {key.creditLimit ? (
                    <span className={(key.totalCreditsUsed || 0) >= key.creditLimit ? "text-red-500 font-medium" : ""}>
                      Pemakaian: {(key.totalCreditsUsed || 0).toLocaleString()} / {key.creditLimit.toLocaleString()} kredit
                    </span>
                  ) : (
                    <span>Pemakaian: {(key.totalCreditsUsed || 0).toLocaleString()} kredit</span>
                  )}
                  {key.expiresAt ? (
                    <span className={new Date(key.expiresAt) < new Date() ? "text-red-500 font-medium" : ""}>
                      Kedaluwarsa: {new Date(key.expiresAt).toLocaleDateString("id-ID")}
                    </span>
                  ) : (
                    <span>Masa Aktif: Selamanya</span>
                  )}
                  {Array.isArray(key.allowedModels) && key.allowedModels.length > 0 ? (
                    <span className="bg-muted px-1.5 py-0.5 rounded" title={key.allowedModels.join(", ")}>
                      {key.allowedModels.length} Model Diizinkan
                    </span>
                  ) : (
                    <span className="bg-muted px-1.5 py-0.5 rounded">Semua Model</span>
                  )}
                  <span>Full key hanya muncul saat dibuat</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditDialog(key)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="Ubah API Key"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRevokeTarget(key)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Nonaktifkan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create dialog */}
      <ResponsivePanel
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Buat API Key Baru"
        description="Berikan nama yang mudah dikenali untuk key ini."
        footer={
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => createMutation.mutate({
                name: newKeyName,
                expiresAt: newKeyExpiresAt || null,
                creditLimit: newKeyUnlimitedCredit ? null : (parseInt(newKeyCreditLimit) || null),
                allowedModels: newKeyAllowedModels.length > 0 ? newKeyAllowedModels : null,
              })}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Membuat..." : "Buat Key"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama Key</label>
            <Input
              placeholder="Contoh: My App, Testing, Production"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kedaluwarsa (Opsional)</label>
            <Input
              type="date"
              value={newKeyExpiresAt}
              onChange={(e) => setNewKeyExpiresAt(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 7);
                setNewKeyExpiresAt(d.toISOString().split('T')[0]);
              }}>1 Minggu</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                const d = new Date(); d.setMonth(d.getMonth() + 1);
                setNewKeyExpiresAt(d.toISOString().split('T')[0]);
              }}>1 Bulan</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                const d = new Date(); d.setFullYear(d.getFullYear() + 1);
                setNewKeyExpiresAt(d.toISOString().split('T')[0]);
              }}>1 Tahun</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                setNewKeyExpiresAt('');
              }}>Selamanya</Button>
            </div>
            <p className="text-xs text-muted-foreground">Kosongkan jika aktif selamanya.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Batas Kredit (Opsional)</label>
            <div className="flex items-center gap-2 mb-1">
              <Switch id="unlimitedCreate" checked={newKeyUnlimitedCredit} onCheckedChange={setNewKeyUnlimitedCredit} />
              <label htmlFor="unlimitedCreate" className="text-xs text-muted-foreground cursor-pointer select-none">Unlimited (Mengikuti saldo utama)</label>
            </div>
            {!newKeyUnlimitedCredit && (
              <Input
                type="number"
                placeholder="Maksimal kredit yang bisa dipakai..."
                value={newKeyCreditLimit}
                onChange={(e) => setNewKeyCreditLimit(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Akses Model (Opsional)</label>
            <p className="text-xs text-muted-foreground mb-2">Pilih model yang diizinkan, atau biarkan kosong untuk semua model.</p>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-border/50 rounded-lg">
              {AVAILABLE_MODELS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-primary"
                    checked={newKeyAllowedModels.includes(m)}
                    onChange={(e) => {
                      if (e.target.checked) setNewKeyAllowedModels(prev => [...prev, m]);
                      else setNewKeyAllowedModels(prev => prev.filter(x => x !== m));
                    }}
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>
        </div>
      </ResponsivePanel>

      {/* New key reveal dialog */}
      <Dialog open={!!newKeyResult} onOpenChange={() => setNewKeyResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              API Key Berhasil Dibuat
            </DialogTitle>
            <DialogDescription>
              Simpan key ini sekarang - kamu tidak akan bisa melihatnya lagi setelah dialog ini ditutup.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Ini adalah satu-satunya kesempatan untuk melihat full key. Simpan di tempat yang aman!
            </p>
          </div>
          {newKeyResult && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">API Key kamu:</label>
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <code className="flex-1 text-xs font-mono break-all">
                  {showFullKey ? newKeyResult.fullKey : "mk_live_" + "*".repeat(32)}
                </code>
                <button onClick={() => setShowFullKey(!showFullKey)} className="text-muted-foreground hover:text-foreground">
                  {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <CopyButton text={newKeyResult.fullKey} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setNewKeyResult(null); setShowFullKey(false); }}>
              Sudah Disimpan, Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <ResponsivePanel
        open={!!editTarget}
        onOpenChange={() => setEditTarget(null)}
        title="Ubah Pengaturan API Key"
        footer={
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => editTarget && renameMutation.mutate({
                id: editTarget.id,
                name: editName,
                expiresAt: editExpiresAt || null,
                creditLimit: editUnlimitedCredit ? null : (parseInt(editCreditLimit) || null),
                allowedModels: editAllowedModels.length > 0 ? editAllowedModels : null,
              })}
              disabled={renameMutation.isPending}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama Key</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kedaluwarsa (Opsional)</label>
            <Input
              type="date"
              value={editExpiresAt}
              onChange={(e) => setEditExpiresAt(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 7);
                setEditExpiresAt(d.toISOString().split('T')[0]);
              }}>1 Minggu</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                const d = new Date(); d.setMonth(d.getMonth() + 1);
                setEditExpiresAt(d.toISOString().split('T')[0]);
              }}>1 Bulan</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                const d = new Date(); d.setFullYear(d.getFullYear() + 1);
                setEditExpiresAt(d.toISOString().split('T')[0]);
              }}>1 Tahun</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                setEditExpiresAt('');
              }}>Selamanya</Button>
            </div>
            <p className="text-xs text-muted-foreground">Kosongkan jika aktif selamanya.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Batas Kredit (Opsional)</label>
            <div className="flex items-center gap-2 mb-1">
              <Switch id="unlimitedEdit" checked={editUnlimitedCredit} onCheckedChange={setEditUnlimitedCredit} />
              <label htmlFor="unlimitedEdit" className="text-xs text-muted-foreground cursor-pointer select-none">Unlimited (Mengikuti saldo utama)</label>
            </div>
            {!editUnlimitedCredit && (
              <Input
                type="number"
                placeholder="Maksimal kredit yang bisa dipakai..."
                value={editCreditLimit}
                onChange={(e) => setEditCreditLimit(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Akses Model (Opsional)</label>
            <p className="text-xs text-muted-foreground mb-2">Pilih model yang diizinkan, atau biarkan kosong untuk semua model.</p>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-border/50 rounded-lg">
              {AVAILABLE_MODELS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-primary"
                    checked={editAllowedModels.includes(m)}
                    onChange={(e) => {
                      if (e.target.checked) setEditAllowedModels(prev => [...prev, m]);
                      else setEditAllowedModels(prev => prev.filter(x => x !== m));
                    }}
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>
        </div>
      </ResponsivePanel>

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan API Key</DialogTitle>
            <DialogDescription>
              Key <span className="font-semibold text-foreground">"{revokeTarget?.name}"</span> akan dinonaktifkan permanen.
              Aplikasi yang menggunakan key ini akan berhenti bekerja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Menonaktifkan..." : "Ya, Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
