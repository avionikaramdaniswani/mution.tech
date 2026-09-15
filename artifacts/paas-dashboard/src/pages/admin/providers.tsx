import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Cpu, Download, Eye, EyeOff, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";

interface ProviderModel { modelId: string; displayName: string; brandProvider: string; upstreamModelId: string; enabled: boolean }
interface ProviderStatus { id: string; name: string; openaiBase: string; type: "conduit" | "generic"; priority: number; enabled: boolean; inCooldown: boolean; cooldownExpiresAt: string | null; models: ProviderModel[] }
type ModelForm = ProviderModel & { originalModelId?: string };
const emptyModelForm: ModelForm = { modelId: "", displayName: "", brandProvider: "Other", upstreamModelId: "", enabled: true };

interface ProviderForm { id: string; name: string; baseUrl: string; apiKey: string; type: string; priority: number }
const emptyProviderForm: ProviderForm = { id: "", name: "", baseUrl: "", apiKey: "", type: "generic", priority: 0 };

async function fetchProviders(): Promise<ProviderStatus[]> { const res = await fetch("/api/admin/providers", { credentials: "include" }); if (!res.ok) throw new Error(); return res.json(); }
async function request(url: string, method: string, body?: unknown) {
  const res = await csrfFetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || "Request failed");
  }
}

function StatusBadge({ provider }: { provider: ProviderStatus }) {
  if (!provider.enabled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Nonaktif</Badge>;
  if (provider.inCooldown) return <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700"><Clock className="h-3 w-3" /> Cooldown</Badge>;
  return <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>;
}

export default function AdminProviders() {
  const { toast } = useToast(); const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null); const [search, setSearch] = useState("");
  const [modelEditor, setModelEditor] = useState<{ providerId: string; form: ModelForm } | null>(null);
  const [providerEditor, setProviderEditor] = useState<{ form: ProviderForm; editing: boolean } | null>(null);
  const [importEditor, setImportEditor] = useState<{ providerId: string; loading: boolean; models: { id: string, selected: boolean }[] } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: providers, isLoading } = useQuery({ queryKey: ["admin", "providers"], queryFn: fetchProviders, refetchInterval: 10000 });

  const mutate = useMutation({
    mutationFn: ({ url, method, body }: { url: string; method: string; body?: unknown }) => request(url, method, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setModelEditor(null);
      setProviderEditor(null);
      setShowApiKey(false);
      toast({ title: "Konfigurasi berhasil disimpan" });
    },
    onError: (err: Error) => toast({ title: err.message || "Gagal menyimpan konfigurasi", variant: "destructive" }),
  });

  const saveModel = () => {
    if (!modelEditor) return; const { providerId, form } = modelEditor;
    if (!form.modelId.trim() || !form.displayName.trim() || !form.upstreamModelId.trim()) { toast({ title: "Semua kolom model wajib diisi", variant: "destructive" }); return; }
    const editing = Boolean(form.originalModelId);
    mutate.mutate({ url: editing ? `/api/admin/providers/${encodeURIComponent(providerId)}/models/${encodeURIComponent(form.originalModelId!)}` : `/api/admin/providers/${encodeURIComponent(providerId)}/models`, method: editing ? "PUT" : "POST", body: { modelId: form.modelId, displayName: form.displayName, brandProvider: form.brandProvider === "Other" ? "" : form.brandProvider, upstreamModelId: form.upstreamModelId, enabled: form.enabled } });
  };

  const saveProvider = () => {
    if (!providerEditor) return;
    const { form, editing } = providerEditor;
    if (!form.name.trim() || !form.baseUrl.trim()) { toast({ title: "Nama dan Base URL wajib diisi", variant: "destructive" }); return; }
    if (!editing && (!form.id.trim() || !form.apiKey.trim())) { toast({ title: "ID dan API Key wajib diisi untuk provider baru", variant: "destructive" }); return; }
    if (editing) {
      mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(form.id)}`, method: "PUT", body: { name: form.name.trim(), baseUrl: form.baseUrl.trim(), apiKey: form.apiKey.trim() || undefined, type: form.type, priority: form.priority } });
    } else {
      mutate.mutate({ url: "/api/admin/providers", method: "POST", body: { id: form.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_"), name: form.name.trim(), baseUrl: form.baseUrl.trim(), apiKey: form.apiKey.trim(), type: form.type, priority: form.priority } });
    }
  };

  const fetchRemoteModels = async (providerId: string) => {
    setImportEditor({ providerId, loading: true, models: [] });
    try {
      const res = await csrfFetch(`/api/admin/providers/${encodeURIComponent(providerId)}/models/sync`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi server");
      setImportEditor({ providerId, loading: false, models: data.models.map((m: any) => ({ ...m, selected: true })) });
    } catch (err: any) {
      setImportEditor(null);
      toast({ title: "Gagal import model", description: err.message, variant: "destructive" });
    }
  };

  const saveImportedModels = async () => {
    if (!importEditor) return;
    const selectedModels = importEditor.models.filter(m => m.selected);
    if (!selectedModels.length) return;
    try {
      setImportEditor(prev => prev ? { ...prev, loading: true } : null);
      await Promise.all(selectedModels.map(m => request(`/api/admin/providers/${encodeURIComponent(importEditor.providerId)}/models`, "POST", {
        modelId: m.id,
        displayName: m.id,
        upstreamModelId: m.id,
        brandProvider: "",
        enabled: true
      })));
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      setImportEditor(null);
      toast({ title: "Berhasil menambahkan model" });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan model", description: err.message, variant: "destructive" });
      setImportEditor(prev => prev ? { ...prev, loading: false } : null);
    }
  };


  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold text-[#172033]"><Cpu className="h-6 w-6 text-primary" /> AI Providers</h1>
        <p className="mt-1 text-sm text-[#526173]">Kelola provider dan mapping model upstream secara independen.</p>
      </div>
      <Button onClick={() => { setProviderEditor({ form: { ...emptyProviderForm }, editing: false }); setShowApiKey(false); }}>
        <Plus className="mr-2 h-4 w-4" /> Tambah Provider
      </Button>
    </div>

    {isLoading ? <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> : !providers?.length ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Tidak ada provider terkonfigurasi. Klik "Tambah Provider" untuk memulai.</div> : <div className="space-y-3">{providers.map(p => {
      const open = expanded === p.id; const q = search.toLowerCase(); const models = p.models.filter(m => !q || [m.modelId, m.displayName, m.brandProvider, m.upstreamModelId].some(v => v.toLowerCase().includes(q)));
      return <div key={p.id} className={`rounded-lg border border-[#dbe8f3] bg-white shadow-sm ${p.enabled ? "" : "opacity-60"}`}>
        <div className="flex items-center justify-between gap-4 p-5">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(open ? null : p.id)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{p.name || p.id}</span>
                <code className="text-xs text-muted-foreground">{p.id}</code>
                <Badge variant="outline">{p.type}</Badge>
                <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">P{p.priority}</Badge>
                <StatusBadge provider={p} />
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{p.openaiBase} · {p.models.filter(m => m.enabled).length}/{p.models.length} model aktif</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" title="Edit provider" onClick={() => { setProviderEditor({ form: { id: p.id, name: p.name || p.id, baseUrl: p.openaiBase.replace(/\/v1$/, ""), apiKey: "", type: p.type, priority: p.priority }, editing: true }); setShowApiKey(false); }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-red-600" title="Hapus provider" onClick={() => { if (window.confirm(`Hapus provider "${p.name || p.id}" beserta semua model-nya?`)) mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}`, method: "DELETE" }); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Switch checked={p.enabled} disabled={mutate.isPending} onCheckedChange={enabled => mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/toggle`, method: "PATCH", body: { enabled } })} />
          </div>
        </div>
        {open && <div className="border-t bg-[#f8fbfd] p-4"><div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari model atau upstream ID..." className="pl-9" /></div><div className="flex gap-2"><Button variant="outline" onClick={() => fetchRemoteModels(p.id)} disabled={importEditor?.loading && importEditor.providerId === p.id}><Download className="mr-2 h-4 w-4" /> Import dari /models</Button><Button onClick={() => setModelEditor({ providerId: p.id, form: { ...emptyModelForm } })}><Plus className="mr-2 h-4 w-4" /> Tambah model</Button></div></div>
          <div className="overflow-x-auto rounded-md border bg-white"><div className="min-w-[720px]"><div className="grid grid-cols-[1fr_1fr_1fr_110px] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground"><span>Nama</span><span>Model ID publik</span><span>Upstream Model ID</span><span className="text-right">Aksi</span></div>{models.map(m => <div key={m.modelId} className="grid grid-cols-[1fr_1fr_1fr_110px] items-center gap-4 border-b px-4 py-3 last:border-0"><span className="truncate text-sm font-medium">{m.displayName}</span><code className="truncate text-xs">{m.modelId}</code><code className="truncate text-xs text-muted-foreground">{m.upstreamModelId}</code><div className="flex items-center justify-end gap-2"><Switch checked={m.enabled} disabled={!p.enabled || mutate.isPending} onCheckedChange={enabled => mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/models/${encodeURIComponent(m.modelId)}`, method: "PUT", body: { ...m, enabled } })} /><Button size="icon" variant="ghost" onClick={() => setModelEditor({ providerId: p.id, form: { ...m, originalModelId: m.modelId } })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-red-600" onClick={() => { if (window.confirm(`Hapus model ${m.displayName} dari provider ${p.id}?`)) mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/models/${encodeURIComponent(m.modelId)}`, method: "DELETE" }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}{!models.length && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada model. Tambahkan model yang benar-benar tersedia pada provider ini.</p>}</div></div>
        </div>}
      </div>;
    })}</div>}

    <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-[#526173]"><span className="font-semibold text-amber-700">Cara kerja:</span> Provider disimpan di database (API key terenkripsi). Priority menentukan urutan fallback — semakin kecil semakin diprioritaskan.</div>

    {/* Model Editor Dialog */}
    <Dialog open={Boolean(modelEditor)} onOpenChange={open => { if (!open) setModelEditor(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{modelEditor?.form.originalModelId ? "Edit model provider" : "Tambah model provider"}</DialogTitle><DialogDescription>Mapping ini hanya berlaku untuk provider <strong>{modelEditor?.providerId}</strong>.</DialogDescription></DialogHeader>{modelEditor && <div className="space-y-4 py-2"><div className="space-y-2"><Label>Nama tampilan</Label><Input value={modelEditor.form.displayName} placeholder="Contoh: GPT 5.6 Sol" onChange={e => setModelEditor({ ...modelEditor, form: { ...modelEditor.form, displayName: e.target.value } })} /></div><div className="space-y-2"><Label>Model ID publik</Label><Input value={modelEditor.form.modelId} placeholder="Contoh: gpt-5.6-sol" onChange={e => setModelEditor({ ...modelEditor, form: { ...modelEditor.form, modelId: e.target.value } })} /><p className="text-xs text-muted-foreground">ID yang dimasukkan user pada request API.</p></div><div className="space-y-2"><Label>Upstream Model ID</Label><Input value={modelEditor.form.upstreamModelId} placeholder="Contoh: openai/gpt-5.6-sol-202608" onChange={e => setModelEditor({ ...modelEditor, form: { ...modelEditor.form, upstreamModelId: e.target.value } })} /><p className="text-xs text-muted-foreground">ID model asli yang dikenali oleh provider ini.</p></div><div className="flex items-center justify-between rounded-md border p-3"><Label>Aktifkan model</Label><Switch checked={modelEditor.form.enabled} onCheckedChange={enabled => setModelEditor({ ...modelEditor, form: { ...modelEditor.form, enabled } })} /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setModelEditor(null)}>Batal</Button><Button disabled={mutate.isPending} onClick={saveModel}>Simpan model</Button></DialogFooter></DialogContent></Dialog>

    {/* Provider Editor Dialog */}
    <Dialog open={Boolean(providerEditor)} onOpenChange={open => { if (!open) { setProviderEditor(null); setShowApiKey(false); } }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{providerEditor?.editing ? "Edit Provider" : "Tambah Provider Baru"}</DialogTitle>
          <DialogDescription>{providerEditor?.editing ? "Ubah konfigurasi provider. Kosongkan API Key jika tidak ingin mengubahnya." : "Tambahkan provider AI baru. API key akan dienkripsi dan disimpan aman di database."}</DialogDescription>
        </DialogHeader>
        {providerEditor && <div className="space-y-4 py-2">
          {!providerEditor.editing && <div className="space-y-2">
            <Label>Provider ID</Label>
            <Input value={providerEditor.form.id} placeholder="Contoh: openai-main" onChange={e => setProviderEditor({ ...providerEditor, form: { ...providerEditor.form, id: e.target.value } })} />
            <p className="text-xs text-muted-foreground">ID unik (huruf kecil, angka, underscore). Tidak bisa diubah setelah dibuat.</p>
          </div>}
          <div className="space-y-2">
            <Label>Nama Provider</Label>
            <Input value={providerEditor.form.name} placeholder="Contoh: OpenAI Primary" onChange={e => setProviderEditor({ ...providerEditor, form: { ...providerEditor.form, name: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={providerEditor.form.baseUrl} placeholder="Contoh: https://api.openai.com" onChange={e => setProviderEditor({ ...providerEditor, form: { ...providerEditor.form, baseUrl: e.target.value } })} />
            <p className="text-xs text-muted-foreground">/v1 akan ditambahkan otomatis jika belum ada.</p>
          </div>
          <div className="space-y-2">
            <Label>API Key {providerEditor.editing && <span className="text-muted-foreground font-normal">(kosongkan jika tidak ingin mengubah)</span>}</Label>
            <div className="relative">
              <Input type={showApiKey ? "text" : "password"} value={providerEditor.form.apiKey} placeholder={providerEditor.editing ? "••••••••" : "sk-..."} onChange={e => setProviderEditor({ ...providerEditor, form: { ...providerEditor.form, apiKey: e.target.value } })} className="pr-10" />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={providerEditor.form.type} onValueChange={type => setProviderEditor({ ...providerEditor, form: { ...providerEditor.form, type } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="conduit">Conduit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input type="number" min={0} value={providerEditor.form.priority} onChange={e => setProviderEditor({ ...providerEditor, form: { ...providerEditor.form, priority: parseInt(e.target.value) || 0 } })} />
              <p className="text-xs text-muted-foreground">Semakin kecil = prioritas lebih tinggi</p>
            </div>
          </div>
        </div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setProviderEditor(null); setShowApiKey(false); }}>Batal</Button>
          <Button disabled={mutate.isPending} onClick={saveProvider}>{providerEditor?.editing ? "Simpan Perubahan" : "Tambah Provider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* Import Editor Dialog */}
    <Dialog open={Boolean(importEditor)} onOpenChange={open => { if (!open) setImportEditor(null); }}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Model dari Provider</DialogTitle>
          <DialogDescription>Pilih model yang ingin diimpor dari provider <strong>{importEditor?.providerId}</strong>.</DialogDescription>
        </DialogHeader>
        {importEditor && (
          <div className="py-2">
            {importEditor.loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="mt-4 text-sm text-muted-foreground">Mengambil daftar model...</p>
              </div>
            ) : importEditor.models.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Tidak ada model ditemukan di endpoint ini.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="text-sm font-medium">
                    {importEditor.models.filter(m => m.selected).length} dari {importEditor.models.length} model terpilih
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const allSelected = importEditor.models.every(m => m.selected);
                    setImportEditor({ ...importEditor, models: importEditor.models.map(m => ({ ...m, selected: !allSelected })) });
                  }}>
                    {importEditor.models.every(m => m.selected) ? "Batal Pilih Semua" : "Pilih Semua"}
                  </Button>
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                  {importEditor.models.map(m => (
                    <div key={m.id} className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => {
                      setImportEditor({ ...importEditor, models: importEditor.models.map(model => model.id === m.id ? { ...model, selected: !model.selected } : model) });
                    }}>
                      <div className={`flex h-5 w-5 items-center justify-center rounded border ${m.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}>
                        {m.selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate text-sm font-medium">{m.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportEditor(null)}>Batal</Button>
          <Button disabled={!importEditor || importEditor.loading || !importEditor.models.some(m => m.selected)} onClick={saveImportedModels}>
            Import Model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
