import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Cpu, Search, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";

interface ProviderModel { modelId: string; label: string; provider: string; enabled: boolean }
interface ProviderStatus {
  id: string; openaiBase: string; type: "conduit" | "generic"; enabled: boolean;
  inCooldown: boolean; cooldownExpiresAt: string | null; models: ProviderModel[];
}

async function fetchProviders(): Promise<ProviderStatus[]> {
  const res = await fetch("/api/admin/providers", { credentials: "include" });
  if (!res.ok) throw new Error("Gagal mengambil data provider");
  return res.json();
}

async function patchToggle(url: string, enabled: boolean) {
  const res = await csrfFetch(url, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
  if (!res.ok) throw new Error("Gagal mengubah status");
}

function StatusBadge({ provider }: { provider: ProviderStatus }) {
  if (!provider.enabled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Nonaktif</Badge>;
  if (provider.inCooldown) return <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700"><Clock className="h-3 w-3" /> Cooldown</Badge>;
  return <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>;
}

export default function AdminProviders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: providers, isLoading } = useQuery({ queryKey: ["admin", "providers"], queryFn: fetchProviders, refetchInterval: 10000 });
  const toggle = useMutation({
    mutationFn: ({ url, enabled }: { url: string; enabled: boolean }) => patchToggle(url, enabled),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "providers"] }); toast({ title: "Konfigurasi berhasil disimpan" }); },
    onError: () => toast({ title: "Gagal mengubah konfigurasi", variant: "destructive" }),
  });

  return <div className="mx-auto max-w-7xl space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold text-[#172033]"><Cpu className="h-6 w-6 text-primary" /> AI Providers</h1>
      <p className="mt-1 text-sm text-[#526173]">Atur provider dan model yang boleh digunakan pada masing-masing provider.</p>
    </div>
    {isLoading ? <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> :
      !providers?.length ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Tidak ada provider terkonfigurasi.</div> :
      <div className="space-y-3">{providers.map(p => {
        const open = expanded === p.id;
        const q = search.toLowerCase();
        const models = p.models.filter(m => !q || m.modelId.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
        const enabledCount = p.models.filter(m => m.enabled).length;
        return <div key={p.id} className={`rounded-lg border border-[#dbe8f3] bg-white shadow-sm ${p.enabled ? "" : "opacity-60"}`}>
          <div className="flex items-center justify-between gap-4 p-5">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(open ? null : p.id)}>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{p.id}</span><Badge variant="outline">{p.type}</Badge><StatusBadge provider={p} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{p.openaiBase} · {enabledCount}/{p.models.length} model aktif</p></div>
            </button>
            <Switch checked={p.enabled} disabled={toggle.isPending} onCheckedChange={enabled => toggle.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/toggle`, enabled })} />
          </div>
          {open && <div className="border-t bg-[#f8fbfd] p-4">
            <div className="relative mb-3 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari model..." className="pl-9" /></div>
            <div className="overflow-hidden rounded-md border bg-white">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground"><span>Model</span><span>Status</span></div>
              {models.map(m => <div key={m.modelId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-4 py-3 last:border-0">
                <div className="min-w-0"><p className="truncate font-mono text-sm font-medium">{m.modelId}</p><p className="truncate text-xs text-muted-foreground">{m.label} · {m.provider}</p></div>
                <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">{m.enabled ? "Aktif" : "Nonaktif"}</span><Switch checked={m.enabled} disabled={!p.enabled || toggle.isPending} onCheckedChange={enabled => toggle.mutate({ url: `/api/admin/providers/${encodeURIComponent(p.id)}/models/${encodeURIComponent(m.modelId)}/toggle`, enabled })} /></div>
              </div>)}
              {!models.length && <p className="p-6 text-center text-sm text-muted-foreground">Model tidak ditemukan.</p>}
            </div>
          </div>}
        </div>;
      })}</div>}
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-[#526173]"><span className="font-semibold text-amber-700">Catatan:</span> Model yang dinonaktifkan hanya diblokir pada provider tersebut. Provider lain dengan model yang sama tetap dapat melayani request.</div>
  </div>;
}
