import { useAdminListOrders, useAdminGetRevenue, getAdminListOrdersQueryKey, getAdminGetRevenueQueryKey } from "@workspace/api-client-react";
import type { PaymentOrderWithUser } from "@workspace/api-client-react";
import {
  Wallet, TrendingUp, Calendar, CheckCircle2, Clock, XCircle, Receipt,
} from "lucide-react";
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

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:      { label: "Lunas",     color: "rgb(34,197,94)",  icon: CheckCircle2 },
  pending:   { label: "Pending",   color: "rgb(234,179,8)",  icon: Clock },
  expired:   { label: "Kedaluwarsa", color: "rgba(255,255,255,0.4)", icon: XCircle },
  failed:    { label: "Gagal",     color: "rgb(239,68,68)",  icon: XCircle },
  cancelled: { label: "Dibatalkan", color: "rgba(255,255,255,0.4)", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: "rgba(255,255,255,0.4)", icon: Clock };
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pembayaran</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan pendapatan dan seluruh transaksi topup pengguna.</p>
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
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Transaksi Terbaru</h2>
          {orders && <span className="text-xs text-muted-foreground">{orders.length} transaksi</span>}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Table header */}
          <div
            className="grid px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: "1fr 120px 110px 130px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
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
          ) : !orders || orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Receipt className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
            </div>
          ) : (
            <div>
              {orders.map((order: PaymentOrderWithUser, i: number) => (
                <div
                  key={order.id}
                  className="grid items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                  style={{
                    gridTemplateColumns: "1fr 120px 110px 130px",
                    borderBottom: i < orders.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={order.ownerName} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.ownerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.ownerEmail}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.amount)}</span>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Time */}
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
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
  );
}
