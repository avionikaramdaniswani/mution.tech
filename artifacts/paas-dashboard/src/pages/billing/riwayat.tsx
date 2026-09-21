import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  RefreshCw, Loader2, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Ban, XCircle, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: "Menunggu",
    colorClass: "text-orange-600 dark:text-orange-500",
    bgClass: "bg-orange-100 dark:bg-orange-500/10",
    borderClass: "border-orange-200 dark:border-orange-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  paid: {
    label: "Lunas",
    colorClass: "text-emerald-600 dark:text-emerald-500",
    bgClass: "bg-emerald-100 dark:bg-emerald-500/10",
    borderClass: "border-emerald-200 dark:border-emerald-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Gagal",
    colorClass: "text-red-600 dark:text-red-500",
    bgClass: "bg-red-100 dark:bg-red-500/10",
    borderClass: "border-red-200 dark:border-red-500/20",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  expired: {
    label: "Kadaluarsa",
    colorClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-500/10",
    borderClass: "border-slate-200 dark:border-slate-500/20",
    icon: <XCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Dibatalkan",
    colorClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-500/10",
    borderClass: "border-slate-200 dark:border-slate-500/20",
    icon: <Ban className="h-3 w-3" />,
  },
};

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all",       label: "Semua" },
  { key: "pending",   label: "Menunggu" },
  { key: "paid",      label: "Lunas" },
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
    <div className="space-y-6 max-w-2xl mx-auto pb-12 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Riwayat Transaksi</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            {loading
              ? "Memuat data transaksi..."
              : `Menampilkan ${orders.length} transaksi terakhir.`}
          </p>
        </div>
        <button
          onClick={refresh}
          className="h-10 w-10 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-muted-foreground transition-all active:scale-95"
          title="Refresh Riwayat"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            const sc = tab.key !== "all" ? STATUS_CONFIG[tab.key as OrderStatus] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                  active 
                    ? sc ? cn(sc.bgClass, sc.borderClass, sc.colorClass) : "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {active && sc && sc.icon}
                {tab.label}
                {(counts[tab.key] ?? 0) > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 rounded-full", active ? "opacity-90" : "bg-muted text-muted-foreground")}>
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
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Mengambil riwayat transaksimu...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed rounded-2xl bg-muted/30">
          <p className="text-sm text-muted-foreground font-medium">
            {activeTab === "all"
              ? "Belum ada transaksi sama sekali."
              : `Tidak ada order yang ${STATUS_CONFIG[activeTab as OrderStatus]?.label.toLowerCase() ?? ""}.`}
          </p>
          {activeTab === "all" && (
            <Link href="/billing">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
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
                <div className="group flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99]">
                  
                  {/* Bagian Kiri: Status Icon & Nominal */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 border", sc.bgClass, sc.borderClass, sc.colorClass)}>
                      {sc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <span className="text-lg font-bold text-foreground">
                          {rp(order.amount)}
                        </span>
                        <span className={cn("inline-flex self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-md border", sc.bgClass, sc.borderClass, sc.colorClass)}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        {order.paymentName ?? order.paymentMethod ?? "-"} 
                        <span className="mx-1.5 opacity-40">·</span> 
                        <span className="font-mono uppercase">{order.invoiceNumber}</span>
                      </p>
                    </div>
                  </div>

                  {/* Bagian Kanan: Tanggal & Panah */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-dashed sm:border-solid">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-medium text-foreground">{fmtDate(order.createdAt)}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtTime(order.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
