import { useState, useMemo, useEffect } from "react";
import { useAdminListOrders, useAdminGetRevenue, getAdminListOrdersQueryKey, getAdminGetRevenueQueryKey } from "@workspace/api-client-react";
import type { PaymentOrderWithUser } from "@workspace/api-client-react";
import {
  Wallet, TrendingUp, Calendar, CheckCircle2, Clock, XCircle, Receipt, Search, RotateCcw,
  Coins, CreditCard, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDistanceToNow,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths
} from "date-fns";
import { id as idLocale } from "date-fns/locale";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
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

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:      { label: "Lunas",     color: "rgb(34,197,94)",  icon: CheckCircle2 },
  pending:   { label: "Pending",   color: "rgb(234,179,8)",  icon: Clock },
  expired:   { label: "Kedaluwarsa", color: "rgb(82,97,115)", icon: XCircle },
  failed:    { label: "Gagal",     color: "rgb(239,68,68)",  icon: XCircle },
  cancelled: { label: "Dibatalkan", color: "rgb(82,97,115)", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: "rgb(82,97,115)", icon: Clock };
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

type AdminPaymentOrder = PaymentOrderWithUser & {
  tokenPackageId?: number | null;
  tokenPackageName?: string | null;
  tokenPackageCategory?: "claude" | "gpt" | null;
};

type AdminRevenue = {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  balanceRedeemedTotal?: number;
  balanceRedeemedMonth?: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
};

export default function AdminPayments() {
  const { data: revenue, isLoading: revenueLoading } = useAdminGetRevenue({
    query: { queryKey: getAdminGetRevenueQueryKey(), refetchInterval: 5000 },
  });
  const { data: orders, isLoading: ordersLoading } = useAdminListOrders({
    query: { queryKey: getAdminListOrdersQueryKey(), refetchInterval: 5000 },
  });

  const revenueData = revenue as unknown as AdminRevenue | undefined;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 1. Filter orders based on date range
  const dateFilteredOrders = useMemo(() => {
    if (!orders) return [];
    if (dateFilter === "all") return orders as AdminPaymentOrder[];

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    return (orders as AdminPaymentOrder[]).filter(o => {
      const created = new Date(o.createdAt);
      if (isNaN(created.getTime())) return true;

      switch (dateFilter) {
        case "today":
          return created >= todayStart && created <= todayEnd;
        case "yesterday": {
          const yStart = startOfDay(subDays(now, 1));
          const yEnd = endOfDay(subDays(now, 1));
          return created >= yStart && created <= yEnd;
        }
        case "7d": {
          const start7 = startOfDay(subDays(now, 6));
          return created >= start7 && created <= todayEnd;
        }
        case "30d": {
          const start30 = startOfDay(subDays(now, 29));
          return created >= start30 && created <= todayEnd;
        }
        case "this_month": {
          const mStart = startOfMonth(now);
          const mEnd = endOfMonth(now);
          return created >= mStart && created <= mEnd;
        }
        case "last_month": {
          const lm = subMonths(now, 1);
          const lmStart = startOfMonth(lm);
          const lmEnd = endOfMonth(lm);
          return created >= lmStart && created <= lmEnd;
        }
        case "custom": {
          let match = true;
          if (customStart) {
            match = match && created >= startOfDay(new Date(customStart));
          }
          if (customEnd) {
            match = match && created <= endOfDay(new Date(customEnd));
          }
          return match;
        }
        default:
          return true;
      }
    });
  }, [orders, dateFilter, customStart, customEnd]);

  // 2. Compute dynamic stats for the selected date range
  const dynamicStats = useMemo(() => {
    const list = dateFilteredOrders;
    const paidList = list.filter(o => o.status === "paid");
    const realCashList = paidList.filter(o => o.provider !== "balance");
    const balanceList = paidList.filter(o => o.provider === "balance");

    const totalCashRevenue = realCashList.reduce((acc, o) => acc + (o.amount || 0), 0);
    const totalBalanceRedeemed = balanceList.reduce((acc, o) => acc + (o.amount || 0), 0);
    const averageOrder = realCashList.length > 0 ? Math.round(totalCashRevenue / realCashList.length) : 0;
    const successRate = list.length > 0 ? Math.round((paidList.length / list.length) * 100) : 0;

    return {
      totalCashRevenue,
      totalBalanceRedeemed,
      realCashCount: realCashList.length,
      balanceCount: balanceList.length,
      paidCount: paidList.length,
      pendingCount: list.filter(o => o.status === "pending").length,
      failedCount: list.filter(o => ["failed", "cancelled", "expired"].includes(o.status)).length,
      totalCount: list.length,
      averageOrder,
      successRate,
    };
  }, [dateFilteredOrders]);

  // 3. Human-readable label for the active date filter
  const dateFilterLabel = useMemo(() => {
    switch (dateFilter) {
      case "today": return "Hari Ini";
      case "yesterday": return "Kemarin";
      case "7d": return "7 Hari Terakhir";
      case "30d": return "30 Hari Terakhir";
      case "this_month": return "Bulan Ini";
      case "last_month": return "Bulan Lalu";
      case "custom": {
        if (customStart && customEnd) return `${customStart} s/d ${customEnd}`;
        if (customStart) return `Sejak ${customStart}`;
        if (customEnd) return `Hingga ${customEnd}`;
        return "Rentang Kustom";
      }
      default: return "Semua Waktu";
    }
  }, [dateFilter, customStart, customEnd]);

  // 4. Final filtered list for the table (date + search + status + method)
  const filteredOrders = useMemo(() => {
    let list = dateFilteredOrders;

    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(o => o.ownerName.toLowerCase().includes(lower) || o.ownerEmail.toLowerCase().includes(lower));
    }

    if (statusFilter !== "all") {
      list = list.filter(o => o.status === statusFilter);
    }

    if (methodFilter === "cash") {
      list = list.filter(o => o.provider !== "balance");
    } else if (methodFilter === "balance") {
      list = list.filter(o => o.provider === "balance");
    }

    return list;
  }, [dateFilteredOrders, search, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const isFilterActive = dateFilter !== "all" || statusFilter !== "all" || methodFilter !== "all" || Boolean(search.trim()) || Boolean(customStart) || Boolean(customEnd);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFilter("all");
    setCustomStart("");
    setCustomEnd("");
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, methodFilter, dateFilter, customStart, customEnd, itemsPerPage]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Pembayaran</h1>
        <p className="mt-1 text-sm text-[#526173]">Ringkasan pendapatan dan seluruh transaksi topup pengguna.</p>
      </div>

      {/* Revenue cards - adapts to filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dateFilter === "all" ? (
          <>
            <StatCard
              label="Kas Masuk Hari Ini"
              value={revenueLoading ? undefined : formatRupiah(revenueData?.todayRevenue ?? 0)}
              icon={Calendar}
              color="rgb(99,102,241)"
              sub="Uang masuk riil (Duitku)"
            />
            <StatCard
              label="Kas Masuk Bulan Ini"
              value={revenueLoading ? undefined : formatRupiah(revenueData?.monthRevenue ?? 0)}
              icon={TrendingUp}
              color="rgb(249,115,22)"
              sub="Uang masuk riil (Duitku)"
            />
            <StatCard
              label="Total Kas Masuk"
              value={revenueLoading ? undefined : formatRupiah(revenueData?.totalRevenue ?? 0)}
              icon={Wallet}
              color="rgb(34,197,94)"
              sub="Rekening bank perusahaan"
            />
            <StatCard
              label="Paket via Saldo"
              value={revenueLoading ? undefined : formatRupiah(revenueData?.balanceRedeemedTotal ?? 0)}
              icon={Coins}
              color="rgb(168,85,247)"
              sub={`Bulan ini: ${formatRupiah(revenueData?.balanceRedeemedMonth ?? 0)}`}
            />
          </>
        ) : (
          <>
            <StatCard
              label={`Kas Masuk (${dateFilterLabel})`}
              value={ordersLoading ? undefined : formatRupiah(dynamicStats.totalCashRevenue)}
              icon={Calendar}
              color="rgb(99,102,241)"
              sub={`Dari ${dynamicStats.realCashCount} order kas lunas`}
            />
            <StatCard
              label={`Paket via Saldo (${dateFilterLabel})`}
              value={ordersLoading ? undefined : formatRupiah(dynamicStats.totalBalanceRedeemed)}
              icon={Coins}
              color="rgb(168,85,247)"
              sub={`Dari ${dynamicStats.balanceCount} transaksi saldo`}
            />
            <StatCard
              label="Rata-rata Order Kas"
              value={ordersLoading ? undefined : formatRupiah(dynamicStats.averageOrder)}
              icon={TrendingUp}
              color="rgb(249,115,22)"
              sub={`Per order kas lunas (${dateFilterLabel})`}
            />
            <StatCard
              label="Tingkat Sukses"
              value={ordersLoading ? undefined : `${dynamicStats.successRate}%`}
              icon={Wallet}
              color="rgb(34,197,94)"
              sub={`${dynamicStats.paidCount} lunas dari ${dynamicStats.totalCount} order`}
            />
          </>
        )}
      </div>

      {/* Status counts - adapts to filter */}
      {(!revenueLoading || !ordersLoading) && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3" style={{ border: "1px solid rgba(34,197,94,0.18)", background: "rgba(34,197,94,0.05)" }}>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(34,197,94)" }} />
            <div>
              <p className="text-base sm:text-lg font-bold tabular-nums leading-none">
                {dateFilter === "all" ? (revenue?.paidCount ?? dynamicStats.paidCount) : dynamicStats.paidCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Lunas</p>
            </div>
          </div>
          <div className="rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3" style={{ border: "1px solid rgba(234,179,8,0.18)", background: "rgba(234,179,8,0.05)" }}>
            <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(234,179,8)" }} />
            <div>
              <p className="text-base sm:text-lg font-bold tabular-nums leading-none">
                {dateFilter === "all" ? (revenue?.pendingCount ?? dynamicStats.pendingCount) : dynamicStats.pendingCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Pending</p>
            </div>
          </div>
          <div className="rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3" style={{ border: "1px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.05)" }}>
            <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(239,68,68)" }} />
            <div>
              <p className="text-base sm:text-lg font-bold tabular-nums leading-none">
                {dateFilter === "all" ? (revenue?.failedCount ?? dynamicStats.failedCount) : dynamicStats.failedCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Gagal / batal</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders table with responsive filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#172033]">Transaksi Terbaru</h2>
              {orders && (
                <span className="text-xs text-[#526173]">
                  ({filteredOrders.length} {filteredOrders.length !== orders.length ? `dari ${orders.length}` : "total"})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative w-full sm:w-60 min-w-[180px]">
                <Input 
                  placeholder="Cari nama atau email..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 border-[#dbe8f3] text-sm bg-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 border-[#dbe8f3] text-sm bg-white">
                  <Calendar className="mr-1.5 h-3.5 w-3.5 text-[#526173]" />
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="yesterday">Kemarin</SelectItem>
                  <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="custom">Kustom Tanggal...</SelectItem>
                </SelectContent>
              </Select>

              {/* Method Filter */}
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 border-[#dbe8f3] text-sm bg-white">
                  <SelectValue placeholder="Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="cash">Uang Masuk (Duitku)</SelectItem>
                  <SelectItem value="balance">Saldo Akun</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] h-9 border-[#dbe8f3] text-sm bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  <SelectItem value="expired">Kedaluwarsa</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset button */}
              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 px-2.5 text-xs text-[#526173] hover:text-[#172033]"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-lg border border-[#dbe8f3] bg-[#f8fbff]">
              <span className="text-xs font-semibold text-[#526173]">Dari:</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 w-full sm:w-auto border-[#dbe8f3] text-xs bg-white"
              />
              <span className="text-xs font-semibold text-[#526173]">Sampai:</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 w-full sm:w-auto border-[#dbe8f3] text-xs bg-white"
              />
              {(customStart || customEnd) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCustomStart(""); setCustomEnd(""); }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Hapus Tanggal
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)]">
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              {/* Table header */}
              <div
                className="grid border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#526173]"
                style={{ gridTemplateColumns: "1.4fr 110px 130px 100px 120px" }}
              >
                <div>Pengguna & Produk</div>
                <div className="text-right">Nominal</div>
                <div className="text-center">Metode</div>
                <div className="text-center">Status</div>
                <div className="text-right">Waktu</div>
              </div>

              {ordersLoading ? (
                <div className="space-y-px">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="px-5 py-4"><Skeleton className="h-8 w-full" /></div>
                  ))}
                </div>
              ) : paginatedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Receipt className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
                </div>
              ) : (
                <div>
                  {paginatedOrders.map((order: AdminPaymentOrder) => (
                    <div
                      key={order.id}
                      className="grid items-center border-b border-[#edf4fb] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[#f8fbff]"
                      style={{
                        gridTemplateColumns: "1.4fr 110px 130px 100px 120px",
                      }}
                    >
                      {/* User & Product */}
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={order.ownerName} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#172033]">{order.ownerName}</p>
                          <p className="truncate text-xs text-[#526173]">{order.ownerEmail}</p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {order.tokenPackageName ? (
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                                order.tokenPackageCategory === "claude"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              )}>
                                <Sparkles className="h-2.5 w-2.5" />
                                {order.tokenPackageName}
                              </span>
                            ) : order.creditsAmount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded bg-[#f8fbff] px-1.5 py-0.5 text-[10px] font-medium text-[#526173] border border-[#dbe8f3]">
                                Topup Kredit ({order.creditsAmount.toLocaleString("id-ID")} cr)
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-[#172033]">{formatRupiah(order.amount)}</span>
                      </div>

                      {/* Method */}
                      <div className="flex justify-center">
                        {order.provider === "balance" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            <Coins className="h-2.5 w-2.5" />
                            Saldo Akun
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <CreditCard className="h-2.5 w-2.5" />
                            Duitku (Kas)
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex justify-center">
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Time */}
                      <div className="text-right">
                        <span className="text-xs text-[#526173]">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: idLocale })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#526173]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="whitespace-nowrap">Tampilkan:</span>
              <Select value={String(itemsPerPage)} onValueChange={(val) => setItemsPerPage(Number(val))}>
                <SelectTrigger className="h-8 w-16 border-[#dbe8f3] px-2 py-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="whitespace-nowrap ml-2">
                Menampilkan <span className="font-semibold text-[#172033]">{(page - 1) * itemsPerPage + 1}</span> hingga{" "}
                <span className="font-semibold text-[#172033]">{Math.min(page * itemsPerPage, filteredOrders.length)}</span> dari{" "}
                <span className="font-semibold text-[#172033]">{filteredOrders.length}</span> transaksi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 border-[#dbe8f3]"
              >
                Sebelumnnya
              </Button>
              <span className="px-2 font-medium">
                Hal {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 border-[#dbe8f3]"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
