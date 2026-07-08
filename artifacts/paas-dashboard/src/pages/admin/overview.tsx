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
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className="text-4xl font-black tabular-nums tracking-normal text-[#172033]">{value.toLocaleString()}</p>
        )}
        {sub && <p className="mt-1 text-xs text-[#526173]">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <section className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#fff7ed_100%)] p-5 shadow-[0_20px_60px_rgba(23,32,51,0.08)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">Overview Platform</h1>
        <p className="mt-3 text-sm leading-6 text-[#526173]">Ringkasan kondisi platform, user, proyek, dan deployment secara keseluruhan.</p>
      </section>

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
          <div className="space-y-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#14b8a6]" />
              <p className="text-sm font-bold text-[#172033]">Kesehatan Platform</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#526173]">Proyek berjalan</span>
                <span className="font-semibold" style={{ color: "rgb(34,197,94)" }}>
                  {stats.runningProjects} / {stats.totalProjects}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#eef8ff]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: stats.totalProjects > 0 ? `${Math.round((stats.runningProjects / stats.totalProjects) * 100)}%` : "0%",
                    background: "rgb(34,197,94)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#526173]">Proyek gagal</span>
                <span className="font-semibold" style={{ color: stats.failedProjects > 0 ? "rgb(239,68,68)" : "rgb(82,97,115)" }}>
                  {stats.failedProjects}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="space-y-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#f97316]" />
              <p className="text-sm font-bold text-[#172033]">Perhatian</p>
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
