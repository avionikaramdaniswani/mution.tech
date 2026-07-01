import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, RefreshCw, Loader2, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, Ban, XCircle,
  CreditCard, Wallet, Copy, Check, ChevronDown, ChevronUp,
} from "lucide-react";

type OrderStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

interface OrderItem {
  id: number;
  invoiceNumber: string;
  reference: string | null;
  paymentMethod: string | null;
  paymentName: string | null;
  amount: number;
  feeMerchant: number | null;
  feeCustomer: number | null;
  totalFee: number | null;
  amountReceived: number | null;
  creditsAmount: number;
  payCode: string | number | null;
  payUrl: string | null;
  checkoutUrl: string | null;
  status: OrderStatus;
  createdAt: string;
  expiredAt: string | null;
  paidAt: string | null;
  orderItems: { name: string; price: number; quantity: number; subtotal: number }[];
}

const STATUS = {
  pending:   { label: "Menunggu",   color: "rgb(249,115,22)",    bg: "rgba(249,115,22,0.1)",   border: "rgba(249,115,22,0.25)",   icon: <Clock className="h-3 w-3" /> },
  paid:      { label: "Berhasil",   color: "rgb(34,197,94)",     bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.25)",    icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:    { label: "Gagal",      color: "rgb(239,68,68)",     bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.25)",    icon: <AlertTriangle className="h-3 w-3" /> },
  expired:   { label: "Kadaluarsa", color: "rgba(148,163,184,1)", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Dibatalkan", color: "rgba(148,163,184,1)", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)", icon: <Ban className="h-3 w-3" /> },
} satisfies Record<OrderStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }>;

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

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    + " · " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
}

function Countdown({ expiredAt }: { expiredAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(expiredAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Sudah berakhir"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setRemaining(`${h} jam ${m} mnt`);
      else if (m > 0) setRemaining(`${m} mnt ${s} dtk`);
      else setRemaining(`${s} detik`);
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [expiredAt]);

  const expired = new Date(expiredAt).getTime() <= Date.now();
  return (
    <span style={{ color: expired ? "rgb(239,68,68)" : "rgb(249,115,22)" }}>
      {remaining}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      title="Salin"
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
      style={{
        background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
        color: copied ? "rgb(34,197,94)" : "rgba(255,255,255,0.5)",
        cursor: "pointer",
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Disalin" : "Salin"}
    </button>
  );
}

function OrderCard({ order, onRefresh }: { order: OrderItem; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [open, setOpen] = useState(order.status === "pending");

  const s = STATUS[order.status];

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function syncStatus() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/sync`, { method: "POST", credentials: "include" });
      const data = await res.json() as { status: string; cannotSync?: boolean };
      if (data.status === "paid") {
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        showToast("Pembayaran dikonfirmasi. Kredit sudah masuk.", true);
      } else if (data.cannotSync) {
        showToast("Order ini tidak bisa dicek otomatis — referensi TriPay tidak tersedia.", false);
      } else {
        showToast("Belum terbayar. Coba lagi setelah menyelesaikan pembayaran.", false);
      }
      onRefresh();
    } catch {
      showToast("Gagal terhubung ke server.", false);
    } finally {
      setSyncing(false);
    }
  }

  async function cancelOrder() {
    if (cancelling) return;
    setCancelling(true);
    setConfirmCancel(false);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/cancel`, { method: "POST", credentials: "include" });
      if (res.ok) {
        showToast("Order dibatalkan.", true);
        onRefresh();
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? "Gagal membatalkan.", false);
      }
    } catch {
      showToast("Gagal terhubung ke server.", false);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      {/* Status stripe */}
      <div style={{ height: 2, background: s.color, opacity: 0.5 }} />

      {/* Header — always visible */}
      <button
        className="w-full text-left px-4 pt-3.5 pb-3 flex items-start justify-between gap-3"
        onClick={() => setOpen(v => !v)}
        style={{ cursor: "pointer", background: "transparent", border: "none" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
            >
              {s.icon}{s.label}
            </span>
            {order.paymentName && (
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {order.paymentName}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono mt-1.5" style={{ color: "rgba(255,255,255,0.22)" }}>
            {order.invoiceNumber}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-white leading-tight">{rp(order.amount)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}
          </p>
        </div>
      </button>

      {/* Collapsed summary row */}
      {!open && (
        <div
          className="px-4 pb-3 flex items-center justify-between"
          onClick={() => setOpen(true)}
          style={{ cursor: "pointer" }}
        >
          <div className="flex items-center gap-3">
            {order.status === "paid" && (
              <span className="text-xs font-semibold" style={{ color: "rgb(34,197,94)" }}>
                +{order.creditsAmount.toLocaleString("id-ID")} kredit
              </span>
            )}
            {order.status === "pending" && order.expiredAt && (
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Berakhir dalam <Countdown expiredAt={order.expiredAt} />
              </span>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
        </div>
      )}

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          {/* IDs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                Invoice
              </p>
              <p className="text-[11px] font-mono break-all" style={{ color: "rgba(255,255,255,0.5)" }}>
                {order.invoiceNumber}
              </p>
            </div>
            {order.reference && (
              <div>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Referensi TriPay
                </p>
                <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {order.reference}
                </p>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>Dibuat</p>
              <p style={{ color: "rgba(255,255,255,0.5)" }}>{fmtDateTime(order.createdAt)}</p>
            </div>
            {order.status === "paid" && order.paidAt ? (
              <div>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>Dibayar</p>
                <p style={{ color: "rgb(34,197,94)" }}>{fmtDateTime(order.paidAt)}</p>
              </div>
            ) : order.expiredAt && order.status === "pending" ? (
              <div>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>Berakhir</p>
                <p style={{ color: "rgb(249,115,22)" }}>
                  <Countdown expiredAt={order.expiredAt} />
                  <span className="block text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {fmtDateTime(order.expiredAt)}
                  </span>
                </p>
              </div>
            ) : order.expiredAt ? (
              <div>
                <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>Berakhir</p>
                <p style={{ color: "rgba(148,163,184,0.7)" }}>{fmtDateTime(order.expiredAt)}</p>
              </div>
            ) : null}
          </div>

          {/* Order items */}
          {order.orderItems.length > 0 && (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {order.orderItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{item.name}</p>
                  <p className="text-xs font-medium text-white">{rp(item.subtotal)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Amount breakdown */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nominal transaksi</span>
              <span className="text-sm font-semibold text-white">{rp(order.amount)}</span>
            </div>
            {order.totalFee !== null && order.totalFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Biaya
                  {order.feeMerchant !== null && order.feeCustomer !== null && (
                    <span className="ml-1 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      (merchant {rp(order.feeMerchant)} + customer {rp(order.feeCustomer)})
                    </span>
                  )}
                </span>
                <span className="text-sm" style={{ color: "rgba(239,68,68,0.8)" }}>−{rp(order.totalFee)}</span>
              </div>
            )}
            {order.amountReceived !== null && (
              <div className="flex justify-between items-center pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Diterima merchant</span>
                <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>{rp(order.amountReceived)}</span>
              </div>
            )}
            <div className="flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Kredit diterima</span>
              <span
                className="text-sm font-bold"
                style={{ color: order.status === "paid" ? "rgb(34,197,94)" : "rgba(255,255,255,0.25)" }}
              >
                {order.status === "paid" ? "+" : ""}{order.creditsAmount.toLocaleString("id-ID")} kredit
              </span>
            </div>
          </div>

          {/* Pay code for pending */}
          {order.status === "pending" && order.payCode && (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)" }}
            >
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(249,115,22,0.6)" }}>
                Kode Pembayaran
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold font-mono tracking-widest" style={{ color: "rgb(249,115,22)" }}>
                  {order.payCode}
                </span>
                <CopyButton value={String(order.payCode)} />
              </div>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div
              className="rounded-lg px-3 py-2.5 flex items-center gap-2 text-xs font-medium"
              style={{
                background: toast.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${toast.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                color: toast.ok ? "rgb(34,197,94)" : "rgb(239,68,68)",
              }}
            >
              {toast.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
              {toast.msg}
            </div>
          )}

          {/* Actions */}
          {order.status === "pending" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {order.checkoutUrl && (
                <a
                  href={order.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{ background: "rgb(249,115,22)", color: "white" }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Lanjut Bayar
                </a>
              )}
              <button
                onClick={syncStatus}
                disabled={syncing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: syncing ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                  cursor: syncing ? "not-allowed" : "pointer",
                }}
              >
                {syncing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengecek…</> : <><RefreshCw className="h-3.5 w-3.5" /> Cek Status</>}
              </button>

              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "rgba(239,68,68,0.6)",
                    cursor: "pointer",
                  }}
                >
                  Batalkan
                </button>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Yakin?</span>
                  <button
                    onClick={cancelOrder}
                    disabled={cancelling}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: cancelling ? "rgba(239,68,68,0.3)" : "rgb(239,68,68)",
                      cursor: cancelling ? "not-allowed" : "pointer",
                    }}
                  >
                    {cancelling ? "Membatalkan…" : "Ya, batalkan"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                  >
                    Tidak
                  </button>
                </div>
              )}
            </div>
          )}

          {(order.status === "failed" || order.status === "expired" || order.status === "cancelled") && (
            <div className="flex items-center gap-3 pt-1">
              <Link href="/billing">
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", color: "rgb(249,115,22)", cursor: "pointer" }}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Topup Lagi
                </button>
              </Link>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                {order.status === "cancelled" && "Order ini sudah dibatalkan."}
                {order.status === "expired" && "Order sudah kadaluarsa. Buat order baru."}
                {order.status === "failed" && "Pembayaran gagal. Silakan coba lagi."}
              </p>
            </div>
          )}

          {/* Collapse button */}
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-center gap-1 pt-1 text-[11px] transition-all"
            style={{ color: "rgba(255,255,255,0.2)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Tutup detail
          </button>
        </div>
      )}
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
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </Link>
        <div>
          <h1 className="text-base font-bold text-white">Riwayat Order</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Data dari TriPay · {orders.length} transaksi
          </p>
        </div>
        <button
          onClick={refresh}
          className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          title="Refresh"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            style={{ color: "rgba(255,255,255,0.4)" }}
          />
        </button>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            const sconf = tab.key !== "all" ? STATUS[tab.key as OrderStatus] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: active ? (sconf ? sconf.bg : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? (sconf ? sconf.border : "rgba(255,255,255,0.18)") : "rgba(255,255,255,0.07)"}`,
                  color: active ? (sconf ? sconf.color : "white") : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                }}
              >
                {active && sconf && sconf.icon}
                {tab.label}
                {(counts[tab.key] ?? 0) > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: active ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)",
                      color: active ? (sconf ? sconf.color : "white") : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Mengambil data dari TriPay…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            {activeTab === "all" ? "Belum ada transaksi." : `Tidak ada order ${STATUS[activeTab as OrderStatus]?.label.toLowerCase() ?? ""}.`}
          </p>
          {activeTab === "all" && (
            <Link href="/billing">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", color: "rgb(249,115,22)", cursor: "pointer" }}
              >
                <Wallet className="h-3.5 w-3.5" />
                Topup Sekarang
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(order => (
            <OrderCard key={`${order.id}-${order.status}`} order={order} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
