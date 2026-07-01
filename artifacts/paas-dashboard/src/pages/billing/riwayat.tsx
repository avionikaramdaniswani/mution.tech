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

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { label: "Menunggu",   color: "#F97316", bg: "rgba(249,115,22,0.08)",   border: "rgba(249,115,22,0.2)",   icon: <Clock className="h-3 w-3" /> },
  paid:      { label: "Berhasil",   color: "#22C55E", bg: "rgba(34,197,94,0.08)",    border: "rgba(34,197,94,0.2)",    icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:    { label: "Gagal",      color: "#EF4444", bg: "rgba(239,68,68,0.08)",    border: "rgba(239,68,68,0.2)",    icon: <AlertTriangle className="h-3 w-3" /> },
  expired:   { label: "Kadaluarsa", color: "#94A3B8", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Dibatalkan", color: "#94A3B8", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", icon: <Ban className="h-3 w-3" /> },
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
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/billing">
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white">Riwayat Order</h1>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            {loading ? "Memuat…" : `${orders.length} transaksi dari TriPay`}
          </p>
        </div>
        <button
          onClick={refresh}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "rgba(255,255,255,0.35)" }} />
        </button>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            const sc = tab.key !== "all" ? STATUS_CONFIG[tab.key as OrderStatus] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: active ? (sc ? sc.bg : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? (sc ? sc.border : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)"}`,
                  color: active ? (sc ? sc.color : "white") : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                }}
              >
                {active && sc && sc.icon}
                {tab.label}
                {(counts[tab.key] ?? 0) > 0 && (
                  <span className="text-[10px] font-bold px-1 rounded" style={{ color: "inherit", opacity: 0.6 }}>
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
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Mengambil data dari TriPay…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            {activeTab === "all" ? "Belum ada transaksi." : `Tidak ada order ${STATUS_CONFIG[activeTab as OrderStatus]?.label.toLowerCase() ?? ""}.`}
          </p>
          {activeTab === "all" && (
            <Link href="/billing">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#F97316", cursor: "pointer" }}
              >
                <Wallet className="h-3.5 w-3.5" />
                Topup Sekarang
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status];
            return (
              <Link key={order.id} href={`/billing/riwayat/${order.id}`}>
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all cursor-pointer group"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.045)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                >
                  {/* Status icon circle */}
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
                  >
                    {sc.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">{rp(order.amount)}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {order.paymentName ?? order.paymentMethod ?? "—"} · {order.invoiceNumber}
                    </p>
                  </div>

                  {/* Date + chevron */}
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtDate(order.createdAt)}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{fmtTime(order.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4" style={{ color: "rgba(255,255,255,0.18)" }} />
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
