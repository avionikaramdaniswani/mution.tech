import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, RefreshCw, Loader2, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Ban, XCircle, Wallet,
} from "lucide-react";

type OrderStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

interface Order {
  id: number;
  invoiceNumber: string;
  reference: string | null;
  paymentMethod: string | null;
  paymentName: string | null;
  amount: number;
  creditsAmount: number;
  status: OrderStatus;
  createdAt: string;
  expiredAt: string | null;
  paidAt: string | null;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; twClass: string; icon: React.ReactNode }> = {
  pending:   { label: "Menunggu",   twClass: "text-orange-500 bg-orange-500/10 border-orange-500/20",   icon: <Clock className="h-3 w-3" /> },
  paid:      { label: "Berhasil",   twClass: "text-green-500 bg-green-500/10 border-green-500/20",    icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:    { label: "Gagal",      twClass: "text-red-500 bg-red-500/10 border-red-500/20",    icon: <AlertTriangle className="h-3 w-3" /> },
  expired:   { label: "Kadaluarsa", twClass: "text-slate-400 bg-slate-500/10 border-slate-500/20", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Dibatalkan", twClass: "text-slate-400 bg-slate-500/10 border-slate-500/20", icon: <Ban className="h-3 w-3" /> },
};

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all",       label: "Semua" },
  { key: "pending",   label: "Menunggu" },
  { key: "paid",      label: "Berhasil" },
  { key: "cancelled", label: "Dibatalkan" },
  { key: "expired",   label: "Kadaluarsa" },
  { key: "failed",    label: "Gagal" },
];

function rp(n: number) {
  return "Rp\u00a0" + n.toLocaleString("id-ID");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function RiwayatOrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/billing/orders", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const filtered = activeTab === "all" ? orders : orders.filter(o => o.status === activeTab);

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const visibleTabs = TABS.filter(t => t.key === "all" || (counts[t.key] ?? 0) > 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Memuat data transaksi..." : `Menampilkan ${orders.length} riwayat transaksi dari TriPay.`}
          </p>
        </div>
        <button
          onClick={refresh}
          className="h-9 w-9 rounded-md border border-border bg-card flex items-center justify-center transition-colors hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            const sc = tab.key !== "all" ? STATUS_CONFIG[tab.key as OrderStatus] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? sc
                      ? sc.twClass
                      : "bg-muted border-border/50 text-foreground"
                    : "bg-card border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {active && sc && sc.icon}
                {tab.label}
                {(counts[tab.key] ?? 0) > 0 && (
                  <span className="text-[10px] font-bold px-1 rounded-sm opacity-60">
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Mengambil data dari TriPay...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-muted-foreground">
            {activeTab === "all" ? "Belum ada transaksi." : `Tidak ada order ${STATUS_CONFIG[activeTab as OrderStatus]?.label.toLowerCase() ?? ""}.`}
          </p>
          {activeTab === "all" && (
            <Link href="/billing">
              <button className="flex items-center gap-1.5 px-4 py-2 mt-2 rounded-lg text-sm font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                <Wallet className="h-4 w-4" />
                Topup Sekarang
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status];
            return (
              <Link key={order.id} href={`/billing/riwayat/${order.id}`}>
                <div
                  className="flex items-center gap-4 px-5 py-4 rounded-xl transition-colors cursor-pointer group bg-card border border-border/50 hover:bg-muted/50"
                >
                  {/* Status icon circle */}
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 border ${sc.twClass}`}
                  >
                    {sc.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold text-foreground truncate">{rp(order.amount)}</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${sc.twClass}`}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs truncate text-muted-foreground">
                      {order.paymentName ?? order.paymentMethod ?? "-"} <span className="mx-1.5 opacity-40">*</span> <span className="font-mono text-[11px]">{order.invoiceNumber}</span>
                    </p>
                  </div>

                  {/* Date + chevron */}
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{fmtDate(order.createdAt)}</p>
                      <p className="text-[10px] text-muted-foreground/60">{fmtTime(order.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

