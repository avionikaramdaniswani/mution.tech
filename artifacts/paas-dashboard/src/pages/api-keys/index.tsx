import { useState } from "react";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, Pencil, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MODEL_CATALOG, groupModelsByProvider, type ModelCatalogEntry } from "@workspace/model-catalog";

type EffectiveCatalogEntry = ModelCatalogEntry & { basePricing?: { input: number; output: number }; pricingMode?: string };

async function fetchCatalog(): Promise<EffectiveCatalogEntry[]> {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("gagal");
  return res.json();
}
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
import { csrfFetch } from "@/lib/csrf";

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
  const res = await csrfFetch(`/api${path}`, {
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

function writeToClipboard(text: string): boolean {
  // Try execCommand first — works synchronously and survives async await
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    if (ok) return true;
  } catch { /* fall through */ }
  // Try modern clipboard API
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return false;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    writeToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

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

function formatCredits(value: number) {
  return value.toLocaleString("id-ID");
}

function ModelAccessSelector({
  value,
  onChange,
  catalog,
}: {
  value: string[];
  onChange: (models: string[]) => void;
  catalog: EffectiveCatalogEntry[];
}) {
  const modelGroups = groupModelsByProvider(catalog as readonly ModelCatalogEntry[]);
  const selected = new Set(value);

  const toggleModel = (modelId: string, checked: boolean) => {
    if (checked) onChange([...selected, modelId]);
    else onChange(value.filter((id) => id !== modelId));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {value.length === 0 ? "Semua model diizinkan." : `${value.length} model dipilih.`}
        </p>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
          Semua Model
        </Button>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-lg border border-border/50">
        {Object.entries(modelGroups).map(([provider, models]) => (
          <div key={provider} className="border-b border-border/40 last:border-b-0">
            <div className="sticky top-0 z-10 bg-background/95 px-3 py-2 text-xs font-semibold text-muted-foreground">
              {provider}
            </div>
            <div className="divide-y divide-border/30">
              {models.map((model) => (
                <label key={model.id} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/30">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={selected.has(model.id)}
                    onChange={(event) => toggleModel(model.id, event.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{model.label}</span>
                      {model.note && (
                        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400">
                          {model.note}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">{model.id}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {model.context} context - {formatCredits(model.pricing.input)} in / {formatCredits(model.pricing.output)} out per 1M token
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const qc = useQueryClient();

  const { data: fetchedCatalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
    staleTime: 30_000,
  });
  const catalog: EffectiveCatalogEntry[] = fetchedCatalog ?? (MODEL_CATALOG as EffectiveCatalogEntry[]);

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState("");
  const [newKeyCreditLimit, setNewKeyCreditLimit] = useState("");
  const [newKeyAllowedModels, setNewKeyAllowedModels] = useState<string[]>([]);
  const [newKeyUnlimitedCredit, setNewKeyUnlimitedCredit] = useState(true);

  const [newKeyResult, setNewKeyResult] = useState<NewKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState("");
  const [editAllowedModels, setEditAllowedModels] = useState<string[]>([]);
  const [editUnlimitedCredit, setEditUnlimitedCredit] = useState(true);

  const [showFullKey, setShowFullKey] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, string>>({});
  const [pendingRevealId, setPendingRevealId] = useState<number | null>(null);

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

  const fetchFullKey = async (key: ApiKey) => {
    if (revealedKeys[key.id]) return revealedKeys[key.id];

    setPendingRevealId(key.id);
    try {
      const data = await apiFetch(`/api-keys/${key.id}/reveal`);
      if (!data.fullKey) throw new Error("Full API key tidak tersedia");

      setRevealedKeys((current) => ({ ...current, [key.id]: data.fullKey }));
      return data.fullKey as string;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menampilkan API key");
      return null;
    } finally {
      setPendingRevealId((current) => (current === key.id ? null : current));
    }
  };

  const toggleRevealKey = async (key: ApiKey) => {
    if (revealedKeys[key.id]) {
      setRevealedKeys((current) => {
        const next = { ...current };
        delete next[key.id];
        return next;
      });
      return;
    }

    await fetchFullKey(key);
  };

  const copyApiKey = async (key: ApiKey) => {
    const fullKey = revealedKeys[key.id] ?? (await fetchFullKey(key));
    if (!fullKey) return;
    const ok = writeToClipboard(fullKey);
    if (ok) toast.success("API key disalin");
    else toast.error("Gagal menyalin API key");
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setRevealedKeys((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDeleteTarget(null);
      toast.success("API key berhasil dihapus");
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
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 break-all text-xs text-muted-foreground font-mono">
                    {revealedKeys[key.id] ?? key.keyPrefix}
                  </code>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleRevealKey(key)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:pointer-events-none disabled:opacity-60"
                      title={revealedKeys[key.id] ? "Sembunyikan API Key" : "Tampilkan API Key"}
                      aria-label={revealedKeys[key.id] ? "Sembunyikan API key" : "Tampilkan API key"}
                      disabled={pendingRevealId === key.id}
                    >
                      {pendingRevealId === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : revealedKeys[key.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyApiKey(key)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:pointer-events-none disabled:opacity-60"
                      title="Salin API Key"
                      aria-label="Salin API key"
                      disabled={pendingRevealId === key.id}
                    >
                      {pendingRevealId === key.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
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
                  onClick={() => setDeleteTarget(key)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Hapus API Key"
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
            <ModelAccessSelector value={newKeyAllowedModels} onChange={setNewKeyAllowedModels} catalog={catalog} />
          </div>
        </div>
      </ResponsivePanel>

      {/* New key reveal dialog */}
      <Dialog
        open={!!newKeyResult}
        onOpenChange={(open) => {
          if (!open) {
            setNewKeyResult(null);
            setShowFullKey(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              API Key Berhasil Dibuat
            </DialogTitle>
            <DialogDescription>
              Key ini bisa dilihat ulang dari daftar API Keys selama data terenkripsi masih tersedia.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Simpan di tempat yang aman dan jangan bagikan ke orang lain.
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
            <ModelAccessSelector value={editAllowedModels} onChange={setEditAllowedModels} catalog={catalog} />
          </div>
        </div>
      </ResponsivePanel>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus API Key</DialogTitle>
            <DialogDescription>
              Key <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> akan dihapus permanen.
              Histori usage tetap tersimpan, tetapi aplikasi yang menggunakan key ini akan berhenti bekerja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
