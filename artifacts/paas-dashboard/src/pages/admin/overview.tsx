import { useGetAdminStats } from "@workspace/api-client-react";
import { Users, Box, Activity, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value?: number;
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
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className="text-4xl font-extrabold tabular-nums tracking-tight">{value.toLocaleString()}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan kondisi platform secara keseluruhan.</p>
      </div>

      {/* Stat grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Pengguna"
            value={stats?.totalUsers}
            icon={Users}
            color="rgb(99,102,241)"
            sub="Terdaftar di platform"
          />
          <StatCard
            label="Total Proyek"
            value={stats?.totalProjects}
            icon={Box}
            color="rgb(249,115,22)"
            sub="Seluruh tenant"
          />
          <StatCard
            label="Total Deployment"
            value={stats?.totalDeployments}
            icon={Activity}
            color="rgb(34,197,94)"
            sub="Sepanjang waktu"
          />
          <StatCard
            label="Proyek Aktif"
            value={stats?.runningProjects}
            icon={Zap}
            color="rgb(234,179,8)"
            sub="Sedang berjalan"
          />
        </div>
      )}

      {/* Secondary row */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Health snapshot */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Kesehatan Platform</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Proyek berjalan</span>
                <span className="font-semibold" style={{ color: "rgb(34,197,94)" }}>
                  {stats.runningProjects} / {stats.totalProjects}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: stats.totalProjects > 0 ? `${Math.round((stats.runningProjects / stats.totalProjects) * 100)}%` : "0%",
                    background: "rgb(34,197,94)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Proyek gagal</span>
                <span className="font-semibold" style={{ color: stats.failedProjects > 0 ? "rgb(239,68,68)" : "rgba(255,255,255,0.4)" }}>
                  {stats.failedProjects}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Perhatian</p>
            </div>
            {stats.failedProjects === 0 ? (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm text-emerald-500">Semua sistem berjalan normal.</p>
              </div>
            ) : (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(239,68,68)" }} />
                <p className="text-sm" style={{ color: "rgb(239,68,68)" }}>
                  {stats.failedProjects} proyek dalam status gagal.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
