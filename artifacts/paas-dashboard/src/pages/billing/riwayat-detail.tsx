import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, RefreshCw, Loader2, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, Ban, XCircle,
  Copy, Check, Wallet, ReceiptText, ChevronDown, ChevronUp
} from "lucide-react";
import { csrfFetch } from "@/lib/csrf";
import { cn } from "@/lib/utils";

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
  qrString: string | null;
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
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: "Menunggu Pembayaran",
    colorClass: "text-orange-600 dark:text-orange-500",
    bgClass: "bg-orange-100 dark:bg-orange-500/10",
    borderClass: "border-orange-200 dark:border-orange-500/20",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  paid: {
    label: "Lunas",
    colorClass: "text-emerald-600 dark:text-emerald-500",
    bgClass: "bg-emerald-100 dark:bg-emerald-500/10",
    borderClass: "border-emerald-200 dark:border-emerald-500/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    label: "Gagal",
    colorClass: "text-red-600 dark:text-red-500",
    bgClass: "bg-red-100 dark:bg-red-500/10",
    borderClass: "border-red-200 dark:border-red-500/20",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  expired: {
    label: "Kadaluarsa",
    colorClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-500/10",
    borderClass: "border-slate-200 dark:border-slate-500/20",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Dibatalkan",
    colorClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-500/10",
    borderClass: "border-slate-200 dark:border-slate-500/20",
    icon: <Ban className="h-3.5 w-3.5" />,
  },
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    + ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function Countdown({ expiredAt }: { expiredAt: string }) {
  const [remaining, setRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function calc() {
      const diff = new Date(expiredAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Berakhir"); setIsExpired(true); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setRemaining(`${h}j ${m}m ${s}d`);
      else if (m > 0) setRemaining(`${m}m ${s}d`);
      else setRemaining(`${s} detik`);
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [expiredAt]);

  return <span className={cn("font-mono font-medium", isExpired ? "text-red-500" : "text-orange-500")}>{remaining}</span>;
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
  
  // Accordion state
  const [instrOpen, setInstrOpen] = useState(false);
  const [instrTab, setInstrTab] = useState(0);
  const [copiedVa, setCopiedVa] = useState(false);

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
      const res = await csrfFetch(`/api/billing/orders/${order.id}/sync`, { method: "POST", credentials: "include" });
      const data = await res.json() as { status: string; cannotSync?: boolean };
      if (data.status === "paid") {
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        showToast("Pembayaran dikonfirmasi. Kredit sudah masuk!", true);
        load();
      } else if (data.cannotSync) {
        showToast("Referensi tidak tersedia - tidak bisa cek otomatis.", false);
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
      const res = await csrfFetch(`/api/billing/orders/${order.id}/cancel`, { method: "POST", credentials: "include" });
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
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Memuat detail...</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm text-muted-foreground">Order tidak ditemukan.</p>
        <Link href="/billing/riwayat">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-muted border text-muted-foreground hover:bg-accent transition-colors">
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12 pt-4">
      
      {/* Header Terpisah */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/billing/riwayat">
            <button className="h-8 w-8 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-muted-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Tagihan</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", sc.bgClass, sc.colorClass, sc.borderClass)}>
            {sc.icon} {sc.label}
          </span>
          <button onClick={load} className="h-8 w-8 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-muted-foreground transition-all active:scale-95" title="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {toast && (
        <div className={cn("rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm font-medium border", toast.ok ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20" : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20")}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Kartu Setruk Utama */}
      <div className="bg-card shadow-sm border rounded-2xl overflow-hidden flex flex-col">
        
        {/* Nominal Besar & Instruksi Bayar (Top Section) */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground font-medium mb-1">Total Pembayaran</p>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">{rp(order.amount)}</h2>
          
          {isPending && order.expiredAt && (
            <p className="text-xs text-muted-foreground mt-3 bg-muted px-3 py-1 rounded-full border">
              Bayar dalam <Countdown expiredAt={order.expiredAt} />
            </p>
          )}

          {isPending && order.payCode && (
            <div className="mt-6 w-full">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Nomor Virtual Account</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <div className="px-4 py-3 bg-muted border rounded-xl w-full sm:w-auto">
                  <span className="text-xl font-mono font-bold tracking-widest text-foreground">{order.payCode}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(String(order.payCode));
                    setCopiedVa(true);
                    setTimeout(() => setCopiedVa(false), 2000);
                  }}
                  className={cn("w-full sm:w-auto px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all", copiedVa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                >
                  {copiedVa ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedVa ? "Tersalin" : "Salin"}
                </button>
              </div>
            </div>
          )}

          {isPending && order.qrString && (
            <div className="mt-6 w-full flex flex-col items-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Scan QR Code</p>
              <div className="p-3 bg-white border shadow-sm rounded-xl inline-block">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.qrString)}`} 
                  alt="QR Code" 
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dashed Separator */}
        <div className="relative h-px w-full">
          <div className="absolute inset-0 border-t-2 border-dashed border-border" />
          <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-background border border-border" />
          <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-background border border-border" />
        </div>

        {/* Detail Transaksi (Key-Value) */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-muted-foreground">ID Pesanan</span>
            <span className="text-sm font-mono text-foreground font-medium text-right break-all">{order.invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-muted-foreground">Metode</span>
            <span className="text-sm text-foreground font-medium text-right">{order.paymentName ?? order.paymentMethod ?? "-"}</span>
          </div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-muted-foreground">Tanggal</span>
            <span className="text-sm text-foreground font-medium text-right">{fmtDateTime(order.createdAt)}</span>
          </div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-muted-foreground">Item</span>
            <span className="text-sm text-foreground font-medium text-right">
              {order.orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ') || "Topup Kredit"}
            </span>
          </div>
          <div className="flex justify-between items-start gap-4 pt-3 border-t border-dashed">
            <span className="text-sm font-medium text-muted-foreground">Kredit Diterima</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">
              +{order.creditsAmount.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Cara Pembayaran Accordion (Jika Pending & ada instruksi) */}
        {isPending && order.instructions.length > 0 && (
          <div className="border-t bg-muted/30">
            <button
              onClick={() => setInstrOpen(!instrOpen)}
              className="w-full px-6 py-4 flex items-center justify-between text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-muted-foreground" />
                Cara Pembayaran
              </div>
              {instrOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            
            {instrOpen && (
              <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2">
                <div className="flex gap-1 overflow-x-auto pb-3 mb-3 border-b hide-scrollbar">
                  {order.instructions.map((instr, i) => (
                    <button
                      key={i}
                      onClick={() => setInstrTab(i)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-md transition-colors",
                        instrTab === i ? "bg-background shadow-sm border text-foreground" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {instr.title}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {order.instructions[instrTab]?.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {order.checkoutUrl && !order.payCode && !order.qrString ? (
            <a
              href={order.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm col-span-1 sm:col-span-2"
            >
              <ExternalLink className="h-4 w-4" /> Lanjutkan ke Aplikasi
            </a>
          ) : (
            <button
              onClick={syncStatus}
              disabled={syncing}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50 disabled:cursor-not-allowed col-span-1 sm:col-span-2"
            >
              {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengecek...</> : <><RefreshCw className="h-4 w-4" /> Saya Sudah Bayar</>}
            </button>
          )}

          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all bg-background hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 border col-span-1 sm:col-span-2"
            >
              Batalkan Pesanan
            </button>
          ) : (
            <div className="col-span-1 sm:col-span-2 p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 flex flex-col gap-3">
              <p className="text-sm text-center text-red-600 dark:text-red-400 font-medium">Batalkan tagihan ini?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-background border hover:bg-accent text-foreground"
                >
                  Tidak
                </button>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                >
                  {cancelling ? "Membatalkan..." : "Ya, Batal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isInactive && (
        <Link href="/billing">
          <button className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Wallet className="h-4 w-4" />
            Topup Kredit Baru
          </button>
        </Link>
      )}

    </div>
  );
}
