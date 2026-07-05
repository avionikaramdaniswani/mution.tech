import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Cpu, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const res = await fetch(`/api/admin/providers/${encodeURIComponent(id)}/toggle`, {
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
    return <Badge variant="outline" className="gap-1.5 text-xs text-amber-400 border-amber-500/40"><Clock className="h-3 w-3" /> Cooldown</Badge>;
  return <Badge variant="outline" className="gap-1.5 text-xs text-emerald-400 border-emerald-500/40"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const style = type === "conduit"
    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
    : "bg-slate-500/10 text-slate-400 border border-slate-500/20";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-6 w-6 text-primary" />
          AI Providers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola provider AI yang aktif. Toggle langsung berlaku - round-robin otomatis ke provider yang aktif.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : !providers || providers.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
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
              className="rounded-2xl p-5 flex items-center justify-between gap-4 transition-opacity"
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                background: p.enabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                opacity: p.enabled ? 1 : 0.55,
              }}
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-sm">{p.id}</span>
                  <TypeBadge type={p.type} />
                  <StatusBadge provider={p} />
                </div>
                <span className="text-xs text-muted-foreground truncate">{p.openaiBase}</span>
                {p.inCooldown && p.cooldownExpiresAt && (
                  <span className="text-xs text-amber-400">
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
        className="rounded-xl px-4 py-3 text-xs text-muted-foreground"
        style={{ border: "1px solid rgba(234,179,8,0.15)", background: "rgba(234,179,8,0.04)" }}
      >
        <span className="text-amber-400 font-medium">Catatan:</span> Toggle bersifat in-memory - reset ke semua aktif saat server restart.
        Untuk menonaktifkan permanen, hapus secret <code className="bg-muted px-1 rounded">PREFIX_API_KEY</code>-nya.
      </div>
    </div>
  );
}
