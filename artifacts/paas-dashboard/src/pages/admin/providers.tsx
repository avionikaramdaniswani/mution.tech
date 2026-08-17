import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Cpu, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";

interface ProviderModel { modelId: string; displayName: string; upstreamModelId: string; enabled: boolean }
interface ProviderStatus { id: string; openaiBase: string; type: "conduit" | "generic"; enabled: boolean; inCooldown: boolean; cooldownExpiresAt: string | null; models: ProviderModel[] }
type ModelForm = ProviderModel & { originalModelId?: string };
const emptyForm: ModelForm = { modelId: "", displayName: "", upstreamModelId: "", enabled: true };

async function fetchProviders(): Promise<ProviderStatus[]> { const res = await fetch("/api/admin/providers", { credentials: "include" }); if (!res.ok) throw new Error(); return res.json(); }
async function request(url: string, method: string, body?: unknown) { const res = await csrfFetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); if (!res.ok) throw new Error(); }

function StatusBadge({ provider }: { provider: ProviderStatus }) {
  if (!provider.enabled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Nonaktif</Badge>;
  if (provider.inCooldown) return <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700"><Clock className="h-3 w-3" /> Cooldown</Badge>;
  return <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>;
}

export default function AdminProviders() {
  const { toast } = useToast(); const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null); const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ providerId: string; form: ModelForm } | null>(null);
  const { data: providers, isLoading } = useQuery({ queryKey: ["admin", "providers"], queryFn: fetchProviders, refetchInterval: 10000 });
  const mutate = useMutation({ mutationFn: ({ url, method, body }: { url: string; method: string; body?: unknown }) => request(url, method, body), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "providers"] }); setEditor(null); toast({ title: "Konfigurasi berhasil disimpan" }); }, onError: () => toast({ title: "Gagal menyimpan konfigurasi", variant: "destructive" }) });
  const saveModel = () => {
    if (!editor) return; const { providerId, form } = editor;
    if (!form.modelId.trim() || !form.displayName.trim() || !form.upstreamModelId.trim()) { toast({ title: "Semua kolom model wajib diisi", variant: "destructive" }); return; }
    const editing = Boolean(form.originalModelId);
    mutate.mutate({ url: editing ? `/api/admin/providers/${encodeURIComponent(providerId)}/models/${encodeURIComponent(form.originalModelId!)}` : `/api/admin/providers/${encodeURIComponent(providerId)}/models`, method: editing ? "PUT" : "POST", body: { modelId: form.modelId, displayName: form.displayName, upstreamModelId: form.upstreamModelId, enabled: form.enabled } });
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold text-[#172033]"><Cpu className="h-6 w-6 text-primary" /> AI Providers</h1><p className="mt-1 text-sm text-[#526173]">Kelola provider dan mapping model upstream secara independen.</p></div>
    {isLoading ? <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> : !providers?.length ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Tidak ada provider terkonfigurasi.</div> : <div className="space-y-3">{providers.map(p => {
      const open = expanded === p.id; const q = search.toLowerCase(); const models = p.models.filter(m => !q || [m.modelId, m.displayName, m.upstreamModelId].some(v => v.toLowerCase().includes(q)));
      return <div key={p.id} className={`rounded-lg border border-[#dbe8f3] bg-white shadow-sm ${p.enabled ? "" : "opacity-60"}`}>
        <div className="flex items-center justify-between gap-4 p-5"><button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(open ? null : p.id)}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{p.id}</span><Badge variant="outline">{p.type}</Badge><StatusBadge provider={p} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{p.openaiBase} · {p.models.filter(m => m.enabled).length}/{p.models.length} model aktif</p></div></button><Switch checked={p.enabled} disabled={mutate.isPending} onCheckedChange={enabled => mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/toggle`, method: "PATCH", body: { enabled } })} /></div>
        {open && <div className="border-t bg-[#f8fbfd] p-4"><div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari model atau upstream ID..." className="pl-9" /></div><Button onClick={() => setEditor({ providerId: p.id, form: { ...emptyForm } })}><Plus className="mr-2 h-4 w-4" /> Tambah model</Button></div>
          <div className="overflow-x-auto rounded-md border bg-white"><div className="min-w-[720px]"><div className="grid grid-cols-[1fr_1fr_1fr_110px] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground"><span>Nama</span><span>Model ID publik</span><span>Upstream Model ID</span><span className="text-right">Aksi</span></div>{models.map(m => <div key={m.modelId} className="grid grid-cols-[1fr_1fr_1fr_110px] items-center gap-4 border-b px-4 py-3 last:border-0"><span className="truncate text-sm font-medium">{m.displayName}</span><code className="truncate text-xs">{m.modelId}</code><code className="truncate text-xs text-muted-foreground">{m.upstreamModelId}</code><div className="flex items-center justify-end gap-2"><Switch checked={m.enabled} disabled={!p.enabled || mutate.isPending} onCheckedChange={enabled => mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/models/${encodeURIComponent(m.modelId)}`, method: "PUT", body: { ...m, enabled } })} /><Button size="icon" variant="ghost" onClick={() => setEditor({ providerId: p.id, form: { ...m, originalModelId: m.modelId } })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-red-600" onClick={() => { if (window.confirm(`Hapus model ${m.displayName} dari provider ${p.id}?`)) mutate.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/models/${encodeURIComponent(m.modelId)}`, method: "DELETE" }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}{!models.length && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada model. Tambahkan model yang benar-benar tersedia pada provider ini.</p>}</div></div>
        </div>}
      </div>;
    })}</div>}
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-[#526173]"><span className="font-semibold text-amber-700">Cara kerja:</span> Model ID publik dipakai oleh user. Upstream Model ID adalah ID asli yang dikirim ke provider dan boleh berbeda pada setiap provider.</div>
    <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open) setEditor(null); }}><DialogContent><DialogHeader><DialogTitle>{editor?.form.originalModelId ? "Edit model provider" : "Tambah model provider"}</DialogTitle><DialogDescription>Mapping ini hanya berlaku untuk provider <strong>{editor?.providerId}</strong>.</DialogDescription></DialogHeader>{editor && <div className="space-y-4 py-2"><div className="space-y-2"><Label>Nama tampilan</Label><Input value={editor.form.displayName} placeholder="Contoh: GPT 5.6 Sol" onChange={e => setEditor({ ...editor, form: { ...editor.form, displayName: e.target.value } })} /></div><div className="space-y-2"><Label>Model ID publik</Label><Input value={editor.form.modelId} placeholder="Contoh: gpt-5.6-sol" onChange={e => setEditor({ ...editor, form: { ...editor.form, modelId: e.target.value } })} /><p className="text-xs text-muted-foreground">ID yang dimasukkan user pada request API.</p></div><div className="space-y-2"><Label>Upstream Model ID</Label><Input value={editor.form.upstreamModelId} placeholder="Contoh: openai/gpt-5.6-sol-202608" onChange={e => setEditor({ ...editor, form: { ...editor.form, upstreamModelId: e.target.value } })} /><p className="text-xs text-muted-foreground">ID model asli yang dikenali oleh provider ini.</p></div><div className="flex items-center justify-between rounded-md border p-3"><Label>Aktifkan model</Label><Switch checked={editor.form.enabled} onCheckedChange={enabled => setEditor({ ...editor, form: { ...editor.form, enabled } })} /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Batal</Button><Button disabled={mutate.isPending} onClick={saveModel}>Simpan model</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
