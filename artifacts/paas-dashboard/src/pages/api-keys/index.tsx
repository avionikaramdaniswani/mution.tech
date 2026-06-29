import { useState } from "react";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, Pencil, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
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

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  totalTokensUsed: number;
  totalRequestsCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  keyPlain?: string | null;
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

export default function ApiKeysPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<NewKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [editName, setEditName] = useState("");
  const [showFullKey, setShowFullKey] = useState(false);
  const [revealingId, setRevealingId] = useState<number | null>(null);

  async function copyKey(key: ApiKey) {
    setRevealingId(key.id);
    try {
      const data = await apiFetch(`/api-keys/${key.id}/reveal`);
      await navigator.clipboard.writeText(data.fullKey);
      toast.success("API key berhasil disalin!");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengambil key");
    } finally {
      setRevealingId(null);
    }
  }

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch("/api-keys"),
  });

  const activeKeys = keys.filter((k) => k.isActive);

  const createMutation = useMutation({
    mutationFn: (name: string) => apiFetch("/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (data: NewKey) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKeyResult(data);
      setShowCreate(false);
      setNewKeyName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch(`/api-keys/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
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

  const baseUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://mution.tech";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate key untuk akses Mution AI API — compatible dengan OpenAI SDK.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Buat Key Baru
        </Button>
      </div>

      {/* Usage info */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          Cara Menggunakan
        </h2>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>Base URL API kamu:</p>
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 font-mono text-foreground">
            <span className="flex-1">{baseUrl}/v1</span>
            <CopyButton text={`${baseUrl}/v1`} />
          </div>
          <p className="mt-2">Contoh penggunaan dengan Python:</p>
          <pre className="rounded-md bg-muted/50 px-3 py-2 text-xs overflow-x-auto text-foreground">{`from openai import OpenAI

client = OpenAI(
    api_key="mk_live_...",  # API key kamu
    base_url="${baseUrl}/v1"
)

response = client.chat.completions.create(
    model="claude-opus-4-6",
    messages=[{"role": "user", "content": "Halo!"}]
)
print(response.choices[0].message.content)`}</pre>
          <p className="pt-1">
            <span className="font-medium text-yellow-500">Tarif:</span> 10 kredit per 1.000 token digunakan.
            Kredit kamu saat ini:{" "}
            <span className="font-semibold text-foreground">Rp {(user?.credits ?? 0).toLocaleString("id-ID")}</span>
          </p>
        </div>
      </div>

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
                <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span>{key.totalRequestsCount.toLocaleString()} request</span>
                  <span>{key.totalTokensUsed.toLocaleString()} token</span>
                  {key.lastUsedAt && (
                    <span>Terakhir: {new Date(key.lastUsedAt).toLocaleDateString("id-ID")}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyKey(key)}
                  disabled={revealingId === key.id}
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
                  title="Salin API key"
                >
                  {revealingId === key.id ? (
                    <span className="h-3.5 w-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Salin Key
                </button>
                <button
                  onClick={() => { setEditTarget(key); setEditName(key.name); }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="Ubah nama"
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
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat API Key Baru</DialogTitle>
            <DialogDescription>
              Berikan nama yang mudah dikenali untuk key ini.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Contoh: My App, Testing, Production"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createMutation.mutate(newKeyName)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button
              onClick={() => createMutation.mutate(newKeyName)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Membuat..." : "Buat Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New key reveal dialog */}
      <Dialog open={!!newKeyResult} onOpenChange={() => setNewKeyResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              API Key Berhasil Dibuat
            </DialogTitle>
            <DialogDescription>
              Simpan key ini sekarang — kamu tidak akan bisa melihatnya lagi setelah dialog ini ditutup.
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
                  {showFullKey ? newKeyResult.fullKey : "mk_live_" + "•".repeat(32)}
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
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Nama API Key</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && editTarget && renameMutation.mutate({ id: editTarget.id, name: editName })}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button
              onClick={() => editTarget && renameMutation.mutate({ id: editTarget.id, name: editName })}
              disabled={renameMutation.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan API Key?</DialogTitle>
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
