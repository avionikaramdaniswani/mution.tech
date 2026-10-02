import { useState, useMemo, useEffect } from "react";
import { useAdminListOrders, useAdminGetRevenue, getAdminListOrdersQueryKey, getAdminGetRevenueQueryKey } from "@workspace/api-client-react";
import type { PaymentOrderWithUser } from "@workspace/api-client-react";
import {
  Wallet, TrendingUp, Calendar, CheckCircle2, Clock, XCircle, Receipt, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
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

export default function AdminPayments() {
  const { data: revenue, isLoading: revenueLoading } = useAdminGetRevenue({
    query: { queryKey: getAdminGetRevenueQueryKey(), refetchInterval: 5000 },
  });
  const { data: orders, isLoading: ordersLoading } = useAdminListOrders({
    query: { queryKey: getAdminListOrdersQueryKey(), refetchInterval: 5000 },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let list = orders;

    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(o => o.ownerName.toLowerCase().includes(lower) || o.ownerEmail.toLowerCase().includes(lower));
    }

    if (statusFilter !== "all") {
      list = list.filter(o => o.status === statusFilter);
    }

    return list;
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, itemsPerPage]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Pembayaran</h1>
        <p className="mt-1 text-sm text-[#526173]">Ringkasan pendapatan dan seluruh transaksi topup pengguna.</p>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={revenueLoading ? undefined : formatRupiah(revenue?.todayRevenue ?? 0)}
          icon={Calendar}
          color="rgb(99,102,241)"
          sub="Dari order lunas"
        />
        <StatCard
          label="Pendapatan Bulan Ini"
          value={revenueLoading ? undefined : formatRupiah(revenue?.monthRevenue ?? 0)}
          icon={TrendingUp}
          color="rgb(249,115,22)"
          sub="Sejak awal bulan"
        />
        <StatCard
          label="Total Pendapatan"
          value={revenueLoading ? undefined : formatRupiah(revenue?.totalRevenue ?? 0)}
          icon={Wallet}
          color="rgb(34,197,94)"
          sub="Sepanjang waktu"
        />
      </div>

      {/* Status counts */}
      {!revenueLoading && revenue && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(34,197,94,0.18)", background: "rgba(34,197,94,0.05)" }}>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(34,197,94)" }} />
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">{revenue.paidCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Lunas</p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(234,179,8,0.18)", background: "rgba(234,179,8,0.05)" }}>
            <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(234,179,8)" }} />
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">{revenue.pendingCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Pending</p>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.05)" }}>
            <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(239,68,68)" }} />
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">{revenue.failedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Gagal / batal</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#172033]">Transaksi Terbaru</h2>
            {orders && <span className="text-xs text-[#526173]">({orders.length} total)</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Input 
                placeholder="Cari nama atau email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 border-[#dbe8f3] text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 border-[#dbe8f3] text-sm">
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
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)]">
          {/* Table header */}
          <div
            className="grid border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#526173]"
            style={{ gridTemplateColumns: "1fr 120px 110px 130px" }}
          >
            <div>Pengguna</div>
            <div className="text-right">Nominal</div>
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
              {paginatedOrders.map((order: PaymentOrderWithUser) => (
                <div
                  key={order.id}
                  className="grid items-center border-b border-[#edf4fb] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[#f8fbff]"
                  style={{
                    gridTemplateColumns: "1fr 120px 110px 130px",
                  }}
                >
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={order.ownerName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#172033]">{order.ownerName}</p>
                      <p className="truncate text-xs text-[#526173]">{order.ownerEmail}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums text-[#172033]">{formatRupiah(order.amount)}</span>
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
