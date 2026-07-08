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
      className="flex flex-col gap-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526173]">{label}</p>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: `${color}18`, border: `1px solid ${color}28` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div>
        {value === undefined ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <p className="text-3xl font-black tabular-nums tracking-normal text-[#172033]">{value}</p>
        )}
        {sub && <p className="mt-1 text-xs text-[#526173]">{sub}</p>}
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
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Pemakaian AI</h1>
          <p className="mt-1 text-sm text-[#526173]">
            Analitik pemakaian AI-proxy: token, kredit terpakai, breakdown model, dan pengguna teratas.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[#dbe8f3] bg-white p-1 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                days === opt.days
                  ? { background: "rgba(249,115,22,0.15)", color: "rgb(249,115,22)" }
                  : { color: "rgb(82,97,115)" }
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
          <TrendingUp className="h-4 w-4 text-[#14b8a6]" />
          <h2 className="text-sm font-bold text-[#172033]">Tren Harian (token)</h2>
        </div>
        <div className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
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
                    <div className="pointer-events-none absolute -top-8 whitespace-nowrap rounded border border-[#dbe8f3] bg-white px-2 py-1 text-[10px] font-semibold text-[#172033] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
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
            <Cpu className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-sm font-bold text-[#172033]">Breakdown per Model</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
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
                {byModel.map((m) => (
                  <div
                    key={m.model}
                    className="border-b border-[#edf4fb] px-5 py-3.5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="mr-3 truncate font-mono text-sm font-semibold text-[#172033]">{m.model}</span>
                      <span className="flex-shrink-0 text-xs tabular-nums text-[#526173]">
                        {formatCompact(m.totalTokens)} tok - {formatNumber(m.requests)} req
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eef8ff]">
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
            <Users2 className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-sm font-bold text-[#172033]">Pengguna Teratas</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
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
                {topUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-3 border-b border-[#edf4fb] px-5 py-3 last:border-b-0"
                  >
                    <UserAvatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#172033]">{u.name}</p>
                      <p className="truncate text-xs text-[#526173]">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-[#172033]">{formatCompact(u.totalTokens)} tok</p>
                      <p className="text-xs tabular-nums text-[#526173]">{formatNumber(u.credits)} kredit</p>
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
