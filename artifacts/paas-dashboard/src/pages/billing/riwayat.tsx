import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, RefreshCw, Loader2, ExternalLink, X,
  CheckCircle2, Clock, AlertTriangle, Ban, Receipt,
  CreditCard, Wallet,
} from "lucide-react";

type OrderStatus = "pending" | "paid" | "failed" | "expired";

interface OrderItem {
  id: number;
  invoiceNumber: string;
  amount: number;
  creditsAmount: number;
  status: OrderStatus;
  paymentUrl: string | null;
  createdAt: string;
  paidAt: string | null;
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  color: string;
  cardBorder: string;
}> = {
  pending: {
    label: "Menunggu Pembayaran",
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.3)",
    color: "rgb(249,115,22)",
    cardBorder: "rgba(249,115,22,0.12)",
  },
  paid: {
    label: "Berhasil",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    color: "rgb(34,197,94)",
    cardBorder: "rgba(34,197,94,0.1)",
  },
  failed: {
    label: "Gagal",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    color: "rgb(239,68,68)",
    cardBorder: "rgba(239,68,68,0.08)",
  },
  expired: {
    label: "Kadaluarsa",
    icon: <Ban className="h-3.5 w-3.5" />,
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.25)",
    color: "rgba(148,163,184,0.8)",
    cardBorder: "rgba(255,255,255,0.05)",
  },
};

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all",     label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "paid",    label: "Berhasil" },
  { key: "failed",  label: "Gagal" },
  { key: "expired", label: "Kadaluarsa" },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function OrderCard({
  order,
  onRefresh,
}: {
  order: OrderItem;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const cfg = STATUS_CONFIG[order.status];

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function syncStatus() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/sync`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { status: string };
      if (data.status === "paid") {
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        showToast("Pembayaran berhasil dikonfirmasi! Kredit sudah masuk.", true);
      } else {
        showToast(`Status terkini: ${STATUS_CONFIG[data.status as OrderStatus]?.label ?? data.status}`, false);
      }
      onRefresh();
    } catch {
      showToast("Gagal cek status, coba lagi.", false);
    } finally {
      setSyncing(false);
    }
  }

  async function cancelOrder() {
    if (cancelling) return;
    setCancelling(true);
    setConfirmCancel(false);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        showToast("Order berhasil dibatalkan.", true);
        onRefresh();
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? "Gagal membatalkan order.", false);
      }
    } catch {
      showToast("Gagal membatalkan order.", false);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{ border: `1px solid ${cfg.cardBorder}`, background: "rgba(255,255,255,0.025)" }}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: cfg.color, opacity: 0.35 }} />

      <div className="px-5 py-4 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <Receipt className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                {order.invoiceNumber}
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

        {/* Amount row */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
              Nominal Bayar
            </p>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
              <p className="text-lg font-bold text-white">{formatRp(order.amount)}</p>
            </div>
          </div>

          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.07)" }} />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
              Kredit Diterima
            </p>
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" style={{ color: order.status === "paid" ? "rgb(34,197,94)" : "rgba(255,255,255,0.3)" }} />
              <p
                className="text-lg font-bold"
                style={{ color: order.status === "paid" ? "rgb(34,197,94)" : "rgba(255,255,255,0.35)" }}
              >
                {order.status === "paid" ? "+" : ""}{order.creditsAmount.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          {order.status === "paid" && order.paidAt && (
            <>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.07)" }} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Dikonfirmasi
                </p>
                <p className="text-xs font-medium" style={{ color: "rgba(34,197,94,0.8)" }}>
                  {formatDate(order.paidAt)}
                </p>
                <p className="text-[11px]" style={{ color: "rgba(34,197,94,0.5)" }}>
                  {formatTime(order.paidAt)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-medium"
            style={{
              background: toast.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${toast.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              color: toast.ok ? "rgb(34,197,94)" : "rgb(239,68,68)",
            }}
          >
            {toast.ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
            {toast.msg}
          </div>
        )}

        {/* Actions */}
        {order.status === "pending" && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {order.paymentUrl && (
              <a
                href={order.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: "rgb(249,115,22)",
                  color: "white",
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Lanjut Bayar
              </a>
            )}

            <button
              onClick={syncStatus}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: syncing ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
                cursor: syncing ? "not-allowed" : "pointer",
              }}
            >
              {syncing
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengecek…</>
                : <><RefreshCw className="h-3.5 w-3.5" /> Cek Status</>}
            </button>

            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ml-auto"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "rgba(239,68,68,0.7)",
                  cursor: "pointer",
                }}
              >
                <X className="h-3.5 w-3.5" />
                Batalkan
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Yakin batalkan?</span>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: cancelling ? "rgba(239,68,68,0.4)" : "rgb(239,68,68)",
                    cursor: cancelling ? "not-allowed" : "pointer",
                  }}
                >
                  {cancelling ? <><Loader2 className="h-3 w-3 animate-spin" /> Membatalkan…</> : "Ya, batalkan"}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                  }}
                >
                  Tidak
                </button>
              </div>
            )}
          </div>
        )}

        {(order.status === "failed" || order.status === "expired") && (
          <div className="flex items-center gap-2 pt-0.5">
            <Link href="/billing">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "rgb(249,115,22)",
                  cursor: "pointer",
                }}
              >
                <Wallet className="h-3.5 w-3.5" />
                Topup Lagi
              </button>
            </Link>
            <p className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              {order.status === "expired"
                ? "Order ini sudah kadaluarsa. Buat order baru untuk topup."
                : "Terjadi kesalahan pada pembayaran ini. Silakan coba lagi."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RiwayatOrderPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/billing/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const filtered = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/billing">
          <button
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <ArrowLeft className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Riwayat Order</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Semua transaksi topup kredit kamu
          </p>
        </div>
        <button
          onClick={refresh}
          className="ml-auto h-8 w-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>

      {/* Tab filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key] ?? 0;
          const statusCfg = tab.key !== "all" ? STATUS_CONFIG[tab.key] : null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: isActive
                  ? (statusCfg ? statusCfg.bg : "rgba(255,255,255,0.1)")
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive
                  ? (statusCfg ? statusCfg.border : "rgba(255,255,255,0.2)")
                  : "rgba(255,255,255,0.07)"}`,
                color: isActive
                  ? (statusCfg ? statusCfg.color : "white")
                  : "rgba(255,255,255,0.35)",
                cursor: "pointer",
              }}
            >
              {isActive && statusCfg && statusCfg.icon}
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)",
                    color: isActive ? (statusCfg ? statusCfg.color : "white") : "rgba(255,255,255,0.3)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Memuat riwayat order…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Receipt className="h-5 w-5" style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
              {activeTab === "all" ? "Belum ada order" : `Tidak ada order ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}`}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
              {activeTab === "all" ? "Topup kredit untuk mulai." : "Coba tab lain atau buat order baru."}
            </p>
          </div>
          {activeTab === "all" && (
            <Link href="/billing">
              <button
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", color: "rgb(249,115,22)" }}
              >
                <Wallet className="h-3.5 w-3.5" />
                Topup Sekarang
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={`${order.id}-${order.status}`} order={order} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
