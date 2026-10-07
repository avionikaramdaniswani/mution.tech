import { useGetAdminStats } from "@workspace/api-client-react";
import { Users, Box, Activity, Zap, TrendingUp, AlertTriangle, CreditCard, Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Legend } from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// --- API Fetchers ---
async function fetchAdminUsage() {
  const res = await fetch("/api/admin/usage?days=14", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch admin usage");
  return res.json();
}

async function fetchAdminRevenue() {
  const res = await fetch("/api/admin/revenue", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch admin revenue");
  return res.json();
}

// --- Components ---
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value?: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
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
          <p className="text-3xl font-black tabular-nums tracking-normal text-[#172033]">{value}</p>
        )}
        {sub && <p className="mt-1 text-xs text-[#526173]">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { data: stats, isLoading: isLoadingStats } = useGetAdminStats();
  
  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ["admin", "usage", "overview"],
    queryFn: fetchAdminUsage,
    refetchInterval: 60000,
  });

  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ["admin", "revenue", "overview"],
    queryFn: fetchAdminRevenue,
    refetchInterval: 60000,
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      {/* Header */}
      <section className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#fff7ed_100%)] p-5 shadow-[0_20px_60px_rgba(23,32,51,0.08)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">Overview Platform</h1>
        <p className="mt-3 text-sm leading-6 text-[#526173]">Ringkasan kondisi platform, user, proyek, dan tren penggunaan API secara keseluruhan.</p>
      </section>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Pendapatan"
          value={revenueData ? formatCurrency(revenueData.totalRevenue) : undefined}
          icon={CreditCard}
          color="rgb(34,197,94)"
          sub={`Bulan ini: ${revenueData ? formatCurrency(revenueData.monthRevenue) : "..."}`}
        />
        <StatCard
          label="API Tokens (14h)"
          value={usageData ? new Intl.NumberFormat("id-ID").format(usageData.totals.totalTokens) : undefined}
          icon={Server}
          color="rgb(249,115,22)"
          sub={`${usageData ? new Intl.NumberFormat("id-ID").format(usageData.totals.requests) : "..."} Requests`}
        />
        <StatCard
          label="Total Pengguna"
          value={stats?.totalUsers?.toLocaleString()}
          icon={Users}
          color="rgb(59,130,246)"
          sub="Terdaftar di platform"
        />
        <StatCard
          label="Proyek Aktif"
          value={stats?.runningProjects?.toLocaleString()}
          icon={Zap}
          color="rgb(249,115,22)"
          sub={`Dari total ${stats?.totalProjects ?? 0} proyek`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* API Usage Chart */}
        <div className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#172033]">Tren Penggunaan API</h2>
              <p className="text-xs text-[#526173]">Total token 14 hari terakhir</p>
            </div>
            <div className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
              API Gateway
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {isLoadingUsage ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : usageData?.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(249,115,22)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="rgb(249,115,22)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    tickFormatter={(val) => format(new Date(val as unknown as string), "d MMM", { locale: id })}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "1px solid #dbe8f3", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                    labelFormatter={(val) => format(new Date(val as unknown as string), "dd MMMM yyyy", { locale: id })}
                    formatter={(value: number) => [new Intl.NumberFormat("id-ID").format(value), "Tokens"]}
                  />
                  <Area type="monotone" dataKey="totalTokens" stroke="rgb(249,115,22)" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Belum ada data usage
              </div>
            )}
          </div>
        </div>

        {/* Model Breakdown Chart */}
        <div className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#172033]">Top AI Models</h2>
              <p className="text-xs text-[#526173]">Distribusi request per model (14h)</p>
            </div>
            <div className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
              Models
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {isLoadingUsage ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : usageData?.byModel?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData.byModel.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="model" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#172033", fontWeight: 500 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: "#f8fbff" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #dbe8f3", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                    formatter={(value: number) => [new Intl.NumberFormat("id-ID").format(value), "Requests"]}
                  />
                  <Bar dataKey="requests" fill="rgb(59,130,246)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Belum ada data model
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Row (Platform Health & Alerts) */}
      {!isLoadingStats && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#14b8a6]" />
              <p className="text-sm font-bold text-[#172033]">Kesehatan Proyek</p>
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

          <div className="space-y-4 rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#f97316]" />
              <p className="text-sm font-bold text-[#172033]">Status Platform</p>
            </div>
            {stats.failedProjects === 0 ? (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm text-emerald-500 font-medium">Semua sistem berjalan normal.</p>
              </div>
            ) : (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(239,68,68)" }} />
                <p className="text-sm font-medium" style={{ color: "rgb(239,68,68)" }}>
                  {stats.failedProjects} proyek dalam status gagal. Segera periksa tab Projects.
                </p>
              </div>
            )}
            
            {revenueData?.pendingCount > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-3 mt-2"
                style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.15)" }}
              >
                <CreditCard className="h-4 w-4 flex-shrink-0 text-amber-500" />
                <p className="text-sm font-medium text-amber-600">
                  {revenueData.pendingCount} pembayaran manual menunggu konfirmasi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
