import { useState } from "react";
import { useAdminGetUsage, getAdminGetUsageQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Cpu, Coins, Hash, TrendingUp, Users2 } from "lucide-react";

function formatNumber(n: number) {
  return n.toLocaleString("id-ID");
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string;
  value?: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}28` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div>
        {value === undefined ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
      style={{ background: "rgba(249,115,22,0.15)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.25)" }}
    >
      {initials}
    </div>
  );
}

const RANGE_OPTIONS = [
  { label: "7 hari", days: 7 },
  { label: "30 hari", days: 30 },
  { label: "90 hari", days: 90 },
];

export default function AdminUsage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminGetUsage(
    { days },
    { query: { queryKey: getAdminGetUsageQueryKey({ days }), refetchInterval: 10000 } },
  );

  const totals = data?.totals;
  const byModel = data?.byModel ?? [];
  const topUsers = data?.topUsers ?? [];
  const daily = data?.daily ?? [];

  const maxDailyTokens = Math.max(1, ...daily.map((d) => d.totalTokens));
  const maxModelTokens = Math.max(1, ...byModel.map((m) => m.totalTokens));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pemakaian AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analitik pemakaian AI-proxy: token, kredit terpakai, breakdown model, dan pengguna teratas.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                days === opt.days
                  ? { background: "rgba(249,115,22,0.15)", color: "rgb(249,115,22)" }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Request"
          value={isLoading ? undefined : formatNumber(totals?.requests ?? 0)}
          icon={Hash}
          color="rgb(99,102,241)"
        />
        <StatCard
          label="Total Token"
          value={isLoading ? undefined : formatNumber(totals?.totalTokens ?? 0)}
          icon={Activity}
          color="rgb(249,115,22)"
          sub={totals ? `${formatNumber(totals.promptTokens)} in - ${formatNumber(totals.completionTokens)} out` : undefined}
        />
        <StatCard
          label="Kredit Terpakai"
          value={isLoading ? undefined : formatNumber(totals?.credits ?? 0)}
          icon={Coins}
          color="rgb(34,197,94)"
        />
        <StatCard
          label="Model Aktif"
          value={isLoading ? undefined : formatNumber(byModel.length)}
          icon={Cpu}
          color="rgb(168,85,247)"
        />
      </div>

      {/* Daily trend */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Tren Harian (token)</h2>
        </div>
        <div
          className="rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : daily.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Activity className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada pemakaian pada rentang ini.</p>
            </div>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {daily.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 group min-w-0">
                  <div className="relative w-full flex justify-center">
                    <div
                      className="w-full max-w-[24px] rounded-t transition-all"
                      style={{
                        height: `${Math.max(2, (d.totalTokens / maxDailyTokens) * 140)}px`,
                        background: "rgba(249,115,22,0.55)",
                      }}
                    />
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded bg-black/80 border border-white/10 pointer-events-none">
                      {formatNumber(d.totalTokens)} tok
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By model + top users */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By model */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Breakdown per Model</h2>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : byModel.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Cpu className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Belum ada data model.</p>
              </div>
            ) : (
              <div>
                {byModel.map((m, i) => (
                  <div
                    key={m.model}
                    className="px-5 py-3.5"
                    style={{ borderBottom: i < byModel.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium font-mono truncate mr-3">{m.model}</span>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                        {formatCompact(m.totalTokens)} tok - {formatNumber(m.requests)} req
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(m.totalTokens / maxModelTokens) * 100}%`, background: "rgb(168,85,247)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top users */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Pengguna Teratas</h2>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : topUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Users2 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Belum ada pengguna aktif.</p>
              </div>
            ) : (
              <div>
                {topUsers.map((u, i) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: i < topUsers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <UserAvatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{formatCompact(u.totalTokens)} tok</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatNumber(u.credits)} kredit</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
