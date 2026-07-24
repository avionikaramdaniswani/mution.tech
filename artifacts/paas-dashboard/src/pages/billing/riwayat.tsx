import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  RefreshCw, Loader2, ChevronRight,
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

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  dimColor: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  pending:   {
    label: "Menunggu",
    color: "#F97316", dimColor: "rgba(249,115,22,0.6)",
    bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)",
    icon: <Clock className="h-3 w-3" />,
  },
  paid:      {
    label: "Berhasil",
    color: "#22C55E", dimColor: "rgba(34,197,94,0.6)",
    bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed:    {
    label: "Gagal",
    color: "#EF4444", dimColor: "rgba(239,68,68,0.6)",
    bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  expired:   {
    label: "Kadaluarsa",
    color: "#94A3B8", dimColor: "rgba(148,163,184,0.5)",
    bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.18)",
    icon: <XCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Dibatalkan",
    color: "#94A3B8", dimColor: "rgba(148,163,184,0.5)",
    bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.18)",
    icon: <Ban className="h-3 w-3" />,
  },
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
          <h1 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
            Riwayat Transaksi
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            {loading
              ? "Memuat data transaksi..."
              : `Menampilkan ${orders.length} riwayat transaksi dari TriPay.`}
          </p>
        </div>
        <button
          onClick={refresh}
          className="h-9 w-9 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            style={{ color: "rgba(255,255,255,0.35)" }}
          />
        </button>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            const sc = tab.key !== "all" ? STATUS_CONFIG[tab.key as OrderStatus] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={
                  active
                    ? sc
                      ? { background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }
                      : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.38)" }
                }
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
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>Mengambil data dari TriPay...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            {activeTab === "all"
              ? "Belum ada transaksi."
              : `Tidak ada order ${STATUS_CONFIG[activeTab as OrderStatus]?.label.toLowerCase() ?? ""}.`}
          </p>
          {activeTab === "all" && (
            <Link href="/billing">
              <button
                className="flex items-center gap-1.5 px-4 py-2 mt-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.2)",
                  color: "#F97316",
                }}
              >
                <Wallet className="h-4 w-4" />
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
                  className="flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-opacity hover:opacity-75"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Status icon circle */}
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
                  >
                    {sc.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {rp(order.amount)}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {order.paymentName ?? order.paymentMethod ?? "-"}
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="font-mono text-[11px]">{order.invoiceNumber}</span>
                    </p>
                  </div>

                  {/* Date + chevron */}
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtDate(order.createdAt)}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>{fmtTime(order.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4" style={{ color: "rgba(255,255,255,0.2)" }} />
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
