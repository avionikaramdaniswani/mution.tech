import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Cpu, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";

interface ProviderStatus {
  id: string;
  openaiBase: string;
  type: "conduit" | "generic";
  enabled: boolean;
  inCooldown: boolean;
  cooldownExpiresAt: string | null;
}

async function fetchProviders(): Promise<ProviderStatus[]> {
  const res = await fetch("/api/admin/providers", { credentials: "include" });
  if (!res.ok) throw new Error("Gagal mengambil data provider");
  return res.json();
}

async function toggleProvider(id: string, enabled: boolean): Promise<void> {
  const res = await csrfFetch(`/api/admin/providers/${encodeURIComponent(id)}/toggle`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Gagal mengubah status provider");
}

function StatusBadge({ provider }: { provider: ProviderStatus }) {
  if (!provider.enabled)
    return <Badge variant="secondary" className="gap-1.5 text-xs"><XCircle className="h-3 w-3" /> Nonaktif</Badge>;
  if (provider.inCooldown)
    return <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-xs text-amber-700"><Clock className="h-3 w-3" /> Cooldown</Badge>;
  return <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const style = type === "conduit"
    ? "border border-violet-200 bg-violet-50 text-violet-700"
    : "border border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>{type}</span>;
}

export default function AdminProviders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: fetchProviders,
    refetchInterval: 5000,
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleProvider(id, enabled),
    onSuccess: (_, { id, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      toast({ title: enabled ? `Provider "${id}" diaktifkan` : `Provider "${id}" dinonaktifkan` });
    },
    onError: () => toast({ title: "Gagal mengubah status provider", variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold tracking-normal text-[#172033]">
          <Cpu className="h-6 w-6 text-primary" />
          AI Providers
        </h1>
        <p className="mt-1 text-sm text-[#526173]">
          Kelola provider AI yang aktif. Toggle langsung berlaku dan tersimpan setelah server restart.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : !providers || providers.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#c9d8e7] bg-white/80 p-10 text-center shadow-[0_12px_34px_rgba(23,32,51,0.04)]"
        >
          <Cpu className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Tidak ada provider terkonfigurasi.</p>
          <p className="text-xs text-muted-foreground/60">
            Set <code className="bg-muted px-1 py-0.5 rounded">PREFIX_API_KEY</code> +{" "}
            <code className="bg-muted px-1 py-0.5 rounded">PREFIX_BASE_URL</code> di Secrets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)] transition-opacity ${p.enabled ? "" : "opacity-55"}`}
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-[#172033]">{p.id}</span>
                  <TypeBadge type={p.type} />
                  <StatusBadge provider={p} />
                </div>
                <span className="text-xs text-muted-foreground truncate">{p.openaiBase}</span>
                {p.inCooldown && p.cooldownExpiresAt && (
                  <span className="text-xs text-amber-700">
                    Cooldown berakhir {formatDistanceToNow(new Date(p.cooldownExpiresAt), { addSuffix: true })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {p.enabled ? "Aktif" : "Nonaktif"}
                </span>
                <Switch
                  checked={p.enabled}
                  disabled={toggle.isPending}
                  onCheckedChange={(checked) => toggle.mutate({ id: p.id, enabled: checked })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="rounded-lg px-4 py-3 text-xs text-[#526173]"
        style={{ border: "1px solid rgba(234,179,8,0.15)", background: "rgba(234,179,8,0.04)" }}
      >
        <span className="font-semibold text-amber-700">Catatan:</span> Toggle disimpan permanen di database. Secret provider tetap diperlukan
        agar provider bisa muncul di daftar.
      </div>
    </div>
  );
}
