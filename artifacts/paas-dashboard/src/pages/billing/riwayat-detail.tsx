import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, RefreshCw, Loader2, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, Ban, XCircle,
  Copy, Check, Wallet, ReceiptText,
} from "lucide-react";

type OrderStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

interface Instruction {
  title: string;
  steps: string[];
}

interface OrderDetail {
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
  instructions: Instruction[];
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string; desc: string; color: string; dimColor: string;
  bg: string; border: string; icon: React.ReactNode;
}> = {
  pending: {
    label: "Menunggu Pembayaran",
    desc: "Selesaikan pembayaran sebelum batas waktu.",
    color: "#F97316", dimColor: "rgba(249,115,22,0.6)",
    bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.18)",
    icon: <Clock className="h-5 w-5" />,
  },
  paid: {
    label: "Pembayaran Berhasil",
    desc: "Kredit sudah ditambahkan ke akun kamu.",
    color: "#22C55E", dimColor: "rgba(34,197,94,0.6)",
    bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.18)",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  failed: {
    label: "Pembayaran Gagal",
    desc: "Transaksi tidak dapat diproses.",
    color: "#EF4444", dimColor: "rgba(239,68,68,0.6)",
    bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.18)",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  expired: {
    label: "Order Kadaluarsa",
    desc: "Batas waktu pembayaran sudah terlewat.",
    color: "#94A3B8", dimColor: "rgba(148,163,184,0.5)",
    bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.15)",
    icon: <XCircle className="h-5 w-5" />,
  },
  cancelled: {
    label: "Order Dibatalkan",
    desc: "Order ini sudah kamu batalkan.",
    color: "#94A3B8", dimColor: "rgba(148,163,184,0.5)",
    bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.15)",
    icon: <Ban className="h-5 w-5" />,
  },
};

function rp(n: number) {
  return "Rp\u00a0" + n.toLocaleString("id-ID");
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    + ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
}

function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function Countdown({ expiredAt }: { expiredAt: string }) {
  const [remaining, setRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function calc() {
      const diff = new Date(expiredAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Sudah berakhir"); setIsExpired(true); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setRemaining(`${h} jam ${m} menit ${s} detik`);
      else if (m > 0) setRemaining(`${m} menit ${s} detik`);
      else setRemaining(`${s} detik`);
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [expiredAt]);

  return <span style={{ color: isExpired ? "#EF4444" : "#F97316", fontWeight: 600 }}>{remaining}</span>;
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: copied ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"}`,
        color: copied ? "#22C55E" : "rgba(255,255,255,0.45)",
        cursor: "pointer",
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : (label ?? "Salin")}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>{title}</p>
      </div>
      <div style={{ background: "rgba(255,255,255,0.015)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, valueStyle }: { label: string; value: React.ReactNode; valueStyle?: React.CSSProperties }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-sm flex-shrink-0" style={{ color: "rgba(255,255,255,0.38)" }}>{label}</span>
      <span className="text-sm text-right" style={{ color: "rgba(255,255,255,0.75)", ...valueStyle }}>{value}</span>
    </div>
  );
}

export default function RiwayatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [instrTab, setInstrTab] = useState(0);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  }

  function load() {
    setLoading(true);
    fetch(`/api/billing/orders/${id}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setOrder(data as OrderDetail); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function syncStatus() {
    if (syncing || !order) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/sync`, { method: "POST", credentials: "include" });
      const data = await res.json() as { status: string; cannotSync?: boolean };
      if (data.status === "paid") {
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        showToast("Pembayaran dikonfirmasi. Kredit sudah masuk!", true);
        load();
      } else if (data.cannotSync) {
        showToast("Referensi TriPay tidak tersedia - tidak bisa cek otomatis.", false);
      } else {
        showToast("Belum terbayar. Coba lagi setelah kamu selesai bayar.", false);
      }
    } catch {
      showToast("Gagal terhubung ke server.", false);
    } finally {
      setSyncing(false);
    }
  }

  async function cancelOrder() {
    if (cancelling || !order) return;
    setCancelling(true);
    setConfirmCancel(false);
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/cancel`, { method: "POST", credentials: "include" });
      if (res.ok) {
        showToast("Order berhasil dibatalkan.", true);
        load();
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Memuat detail...</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Order tidak ditemukan.</p>
        <Link href="/billing/riwayat">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
        </Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status];
  const isPending = order.status === "pending";
  const isDone = order.status === "paid";
  const isInactive = order.status === "expired" || order.status === "failed" || order.status === "cancelled";

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Back + refresh */}
      <div className="flex items-center gap-3">
        <Link href="/billing/riwayat">
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
          </button>
        </Link>
        <h1 className="flex-1 text-base font-bold text-white">Detail Order</h1>
        <button
          onClick={load}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "rgba(255,255,255,0.35)" }} />
        </button>
      </div>

      {/* Status card */}
      <div
        className="rounded-xl px-4 py-4 flex items-start gap-3"
        style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
      >
        <div className="mt-0.5 flex-shrink-0" style={{ color: sc.color }}>{sc.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: sc.color }}>{sc.label}</p>
          <p className="text-xs mt-0.5" style={{ color: sc.dimColor }}>{sc.desc}</p>
          {isPending && order.expiredAt && (
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              Berakhir dalam <Countdown expiredAt={order.expiredAt} />
            </p>
          )}
          {isDone && order.paidAt && (
            <p className="text-xs mt-1" style={{ color: "rgba(34,197,94,0.6)" }}>
              Dibayar {fmtDateShort(order.paidAt)}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-white">{rp(order.amount)}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            +{order.creditsAmount.toLocaleString("id-ID")} kredit
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm font-medium"
          style={{
            background: toast.ok ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
            border: `1px solid ${toast.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: toast.ok ? "#22C55E" : "#EF4444",
          }}
        >
          {toast.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Kode Pembayaran - hanya untuk pending yang punya pay_code */}
      {isPending && order.payCode && (
        <div
          className="rounded-xl px-4 py-4"
          style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(249,115,22,0.55)" }}>
            Kode Pembayaran
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold font-mono tracking-wider" style={{ color: "#F97316" }}>
              {order.payCode}
            </p>
            <CopyBtn value={String(order.payCode)} />
          </div>
          <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Masukkan kode ini saat melakukan pembayaran via {order.paymentName ?? order.paymentMethod ?? "metode yang dipilih"}.
          </p>
        </div>
      )}

      {/* Info Pesanan */}
      <Section title="Info Pesanan">
        <Row label="No. Invoice" value={<span className="font-mono text-xs">{order.invoiceNumber}</span>} />
        {order.reference && (
          <Row label="Ref. TriPay" value={<span className="font-mono text-xs">{order.reference}</span>} />
        )}
        <Row label="Dibuat" value={fmtDateTime(order.createdAt)} />
        {order.paidAt && (
          <Row label="Dibayar" value={fmtDateTime(order.paidAt)} valueStyle={{ color: "#22C55E" }} />
        )}
        {order.expiredAt && (
          <Row
            label="Batas Waktu"
            value={fmtDateTime(order.expiredAt)}
            valueStyle={{ color: isPending ? "#F97316" : "rgba(148,163,184,0.6)" }}
          />
        )}
        <div style={{ borderBottom: "none" }}>
          <Row
            label="Status"
            value={
              <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
              >
                {sc.icon}{sc.label}
              </span>
            }
          />
        </div>
      </Section>

      {/* Metode Pembayaran */}
      {(order.paymentName || order.paymentMethod) && (
        <Section title="Metode Pembayaran">
          <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: "none" }}>
            <div>
              <p className="text-sm font-medium text-white">{order.paymentName ?? order.paymentMethod}</p>
              {order.paymentMethod && order.paymentName && (
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{order.paymentMethod}</p>
              )}
            </div>
            {isPending && order.checkoutUrl && (
              <a
                href={order.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "#F97316", color: "white" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Bayar Sekarang
              </a>
            )}
          </div>
        </Section>
      )}

      {/* Cara Pembayaran - hanya muncul kalau ada instructions dari TriPay */}
      {isPending && order.instructions.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Header seksi */}
          <div className="px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Cara Pembayaran</p>
          </div>

          {/* Tab channel */}
          <div
            className="flex gap-0 overflow-x-auto"
            style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}
          >
            {order.instructions.map((instr, i) => (
              <button
                key={i}
                onClick={() => setInstrTab(i)}
                className="px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${instrTab === i ? "#F97316" : "transparent"}`,
                  color: instrTab === i ? "#F97316" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                }}
              >
                {instr.title}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="px-4 py-4 space-y-3" style={{ background: "rgba(255,255,255,0.015)" }}>
            {order.instructions[instrTab]?.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)", color: "#F97316" }}
                >
                  {i + 1}
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item */}
      {order.orderItems.length > 0 && (
        <Section title="Item Pesanan">
          {order.orderItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < order.orderItems.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <ReceiptText className="h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {item.quantity}x {rp(item.price)}
                </p>
              </div>
              <p className="text-sm font-semibold text-white flex-shrink-0">{rp(item.subtotal)}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Ringkasan Pembayaran */}
      <Section title="Ringkasan Pembayaran">
        <Row label="Nominal Topup" value={rp(order.amount)} />
        <div
          className="flex items-center justify-between gap-4 px-4 py-3.5 mx-0"
          style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Kredit Diterima</span>
          <span
            className="text-base font-bold"
            style={{ color: order.status === "paid" ? "#22C55E" : "rgba(255,255,255,0.2)" }}
          >
            {order.status === "paid" ? "+" : ""}{order.creditsAmount.toLocaleString("id-ID")} kredit
          </span>
        </div>
      </Section>

      {/* Actions */}
      {isPending && (
        <div className="space-y-3 pt-1">
          {order.checkoutUrl && (
            <a
              href={order.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "#F97316", color: "white" }}
            >
              <ExternalLink className="h-4 w-4" />
              Lanjutkan Pembayaran
            </a>
          )}
          <button
            onClick={syncStatus}
            disabled={syncing}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: syncing ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
              cursor: syncing ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengecek Status...</> : <><RefreshCw className="h-4 w-4" /> Cek Status Pembayaran</>}
          </button>
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "rgba(239,68,68,0.5)",
                cursor: "pointer",
              }}
            >
              <Ban className="h-4 w-4" />
              Batalkan Order
            </button>
          ) : (
            <div
              className="rounded-xl px-4 py-3.5 space-y-3"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
            >
              <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
                Batalkan order ini? Tindakan ini tidak bisa diurungkan.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", cursor: "pointer" }}
                >
                  Kembali
                </button>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: cancelling ? "rgba(239,68,68,0.3)" : "#EF4444",
                    cursor: cancelling ? "not-allowed" : "pointer",
                  }}
                >
                  {cancelling ? "Membatalkan..." : "Ya, Batalkan"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isInactive && (
        <div className="pt-1">
          <Link href="/billing">
            <button
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                color: "#F97316",
                cursor: "pointer",
              }}
            >
              <Wallet className="h-4 w-4" />
              Topup Kredit Lagi
            </button>
          </Link>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-6" />
    </div>
  );
}
