import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Loader2, X, CheckCircle2, AlertCircle, RefreshCw, ChevronRight,
  Clock, AlertTriangle, Ban, XCircle, Wallet, History
} from "lucide-react";
import { Link } from "wouter";
import { csrfFetch } from "@/lib/csrf";
import { cn } from "@/lib/utils";

const MIN = 1_000;
const MAX = 10_000_000;

interface CreditPackage {
  id: number;
  name: string;
  description: string | null;
  priceIdr: number;
  creditsAmount: number;
  bonusLabel: string | null;
}

function usePackages() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  useEffect(() => {
    fetch("/api/packages")
      .then(r => r.json())
      .then((data: CreditPackage[]) => { if (Array.isArray(data)) setPackages(data); })
      .catch(() => undefined);
  }, []);
  return packages;
}

interface PaymentChannel {
  code: string;
  name: string;
  group: string;
  icon_url: string;
  minimum_amount: number;
  maximum_amount: number;
}

function usePaymentChannels() {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/billing/payment-channels", { credentials: "include" })
      .then((r) => r.json())
      .then((data: PaymentChannel[] | { error: string }) => {
        if (Array.isArray(data)) setChannels(data);
        else setError((data as { error: string }).error ?? "Gagal memuat channel");
      })
      .catch(() => setError("Gagal memuat channel pembayaran"))
      .finally(() => setLoading(false));
  }, []);

  return { channels, loading, error };
}


function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

// -- Credit card (split: orange left | circuit-board right) -----------------
function CreditCard({ credits, userName }: { credits: number; userName?: string }) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: "1.586 / 1",
        // Base: deep-to-mid orange gradient filling the whole card
        background: "linear-gradient(130deg, #c04800 0%, #e05a00 30%, #f06a00 55%, #f97316 80%, #fb923c 100%)",
        boxShadow: "0 22px 60px rgba(168,61,0,0.30), 0 6px 22px rgba(234,106,0,0.20)",
      }}
    >
      {/* ── Right panel: hero-bg circuit board, diagonal clip ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/hero-bg.png')",
          // Zoom in and focus on the circuit-rich bottom-right zone
          backgroundSize: "200%",
          backgroundPosition: "72% 62%",
          // Diagonal trapezoid cut — wide at top-right, narrower at bottom
          clipPath: "polygon(46% 0%, 100% 0%, 100% 100%, 30% 100%)",
        }}
      />

      {/* Warm orange tint over the image so it blends with the card colour */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: "polygon(46% 0%, 100% 0%, 100% 100%, 30% 100%)",
          background: "rgba(180, 70, 0, 0.38)",
        }}
      />

      {/* Smooth feathered seam between left and right panels */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, #c04800 20%, rgba(192,72,0,0.88) 32%, rgba(192,72,0,0.52) 44%, rgba(192,72,0,0.08) 58%, transparent 70%)",
        }}
      />

      {/* Subtle dot pattern on left (over the solid orange area) */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.10 }}>
        <defs>
          <pattern id="cdots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="white" />
          </pattern>
        </defs>
        {/* Mask to left 50% only */}
        <rect width="50%" height="100%" fill="url(#cdots)" />
      </svg>

      {/* Soft glow top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-40%", left: "-18%", width: "65%", height: "150%",
          background: "radial-gradient(ellipse, rgba(255,200,120,0.18) 0%, transparent 62%)",
        }}
      />

      {/* Card content — lives entirely in the left/orange zone */}
      <div className="absolute inset-0 flex flex-col justify-between p-[7%]" style={{ width: "62%" }}>
        {/* Top row: logo + wordmark */}
        <div className="flex items-center gap-1.5">
          <img
            src="/mution-logo.png"
            alt=""
            className="h-5 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <span
            className="font-extrabold tracking-tight"
            style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, color: "#ffffff" }}
          >
            Mution
          </span>
        </div>

        {/* Middle: chip */}
        <div style={{ width: 34 }}>
          <svg viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
            <rect width="42" height="32" rx="4" fill="#b8960c" />
            <defs>
              <linearGradient id="chip-mc" x1="0" y1="0" x2="42" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f5d060" />
                <stop offset="45%" stopColor="#d4a827" />
                <stop offset="100%" stopColor="#b8960c" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="40" height="30" rx="3.2" fill="url(#chip-mc)" />
            <line x1="14" y1="1" x2="14" y2="31" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <line x1="28" y1="1" x2="28" y2="31" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <line x1="1" y1="11" x2="41" y2="11" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <line x1="1" y1="21" x2="41" y2="21" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <rect x="14.5" y="11.5" width="13" height="9" rx="1.5" fill="rgba(0,0,0,0.16)" />
          </svg>
        </div>

        {/* Bottom: balance + name */}
        <div>
          <p style={{ fontSize: 8, letterSpacing: "0.13em", color: "rgba(255,255,255,0.82)", marginBottom: 3, fontWeight: 600 }}>
            SALDO KREDIT
          </p>
          <p
            className="font-extrabold tabular-nums leading-none"
            style={{ fontSize: 21, color: "#ffffff", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}
          >
            {credits.toLocaleString("id-ID")}
          </p>
          <p
            className="font-semibold truncate mt-2"
            style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(255,255,255,0.78)" }}
          >
            {(userName ?? "—").toUpperCase()}
          </p>
        </div>
      </div>

      {/* CREDITS badge — absolute top-right corner, inside the image zone */}
      <div className="absolute" style={{ top: "7%", right: "6%" }}>
        <span
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.45)",
            background: "rgba(140,50,0,0.50)",
            padding: "2px 8px", borderRadius: 99,
            backdropFilter: "blur(4px)",
          }}
        >
          CREDITS
        </span>
      </div>

      {/* DEBIT label — absolute bottom-right */}
      <div className="absolute" style={{ bottom: "8%", right: "6%" }}>
        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.70)" }}>
          DEBIT
        </p>
      </div>
    </div>
  );
}
// -- End credit card --------------------------------------------------------

type OrderStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

const STATUS_CONFIG: Record<OrderStatus, { label: string; colorClass: string; bgClass: string; borderClass: string; }> = {
  pending: { label: "Menunggu", colorClass: "text-orange-600 dark:text-orange-500", bgClass: "bg-orange-100 dark:bg-orange-500/10", borderClass: "border-orange-200 dark:border-orange-500/20" },
  paid: { label: "Lunas", colorClass: "text-emerald-600 dark:text-emerald-500", bgClass: "bg-emerald-100 dark:bg-emerald-500/10", borderClass: "border-emerald-200 dark:border-emerald-500/20" },
  failed: { label: "Gagal", colorClass: "text-red-600 dark:text-red-500", bgClass: "bg-red-100 dark:bg-red-500/10", borderClass: "border-red-200 dark:border-red-500/20" },
  expired: { label: "Kadaluarsa", colorClass: "text-slate-600 dark:text-slate-400", bgClass: "bg-slate-100 dark:bg-slate-500/10", borderClass: "border-slate-200 dark:border-slate-500/20" },
  cancelled: { label: "Dibatalkan", colorClass: "text-slate-600 dark:text-slate-400", bgClass: "bg-slate-100 dark:bg-slate-500/10", borderClass: "border-slate-200 dark:border-slate-500/20" },
};

function RecentOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/orders", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data.slice(0, 3)); // Top 3
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center px-4">
        <History className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Belum ada riwayat transaksi</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const sc = STATUS_CONFIG[order.status as OrderStatus];
        return (
          <Link key={order.id} href={`/billing/riwayat/${order.id}`}>
            <div className="group flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all">
              <div>
                <p className="text-sm font-bold text-foreground">{formatRp(order.amount)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{order.paymentName ?? "Transfer"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md border", sc.bgClass, sc.borderClass, sc.colorClass)}>
                  {sc.label}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TopupSection() {
  const [step, setStep] = useState(1); // 1 = Nominal, 2 = Metode, 3 = Konfirmasi
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [customRaw, setCustomRaw] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [method, setMethod] = useState("SP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { channels, loading: chLoading, error: chError } = usePaymentChannels();
  const packages = usePackages();

  const PRESETS = [5_000, 10_000, 20_000, 50_000, 100_000, 200_000];

  function pickPreset(amount: number) {
    setCustomRaw(String(amount));
    setIsCustom(true);
    setSelectedPackage(null);
    setError(null);
  }

  const resolvedAmount = (() => {
    if (selectedPackage) return selectedPackage.priceIdr;
    if (isCustom) {
      const n = parseInt(customRaw.replace(/\D/g, ""), 10);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  })();

  const resolvedCredits = selectedPackage ? selectedPackage.creditsAmount : resolvedAmount;

  const amountError = (() => {
    if (!isCustom) return null;
    if (resolvedAmount == null) return null;
    if (resolvedAmount < MIN) return `Minimal ${formatRp(MIN)}`;
    if (resolvedAmount > MAX) return `Maksimal ${formatRp(MAX)}`;
    return null;
  })();

  const canAdvanceStep1 = resolvedAmount != null && !amountError;
  const selectedMethodLabel = channels.find(c => c.code === method)?.name.replace(" Virtual Account", " VA") ?? method;

  function handleCustomInput(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setCustomRaw(digits);
    setSelectedPackage(null);
    setError(null);
  }

  function pickPackage(pkg: CreditPackage) {
    setSelectedPackage(pkg);
    setIsCustom(false);
    setCustomRaw("");
    setError(null);
  }

  async function handlePay() {
    if (!resolvedAmount || amountError || loading) return;
    setLoading(true);
    setError(null);
    try {
      const body = selectedPackage
        ? { packageId: selectedPackage.id, method }
        : { amount: resolvedAmount, method };
      const res = await csrfFetch("/api/billing/duitku/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json() as { paymentUrl?: string; error?: string; orderId?: number };
      if (!res.ok || !data.paymentUrl) {
        setError(data.error ?? "Gagal membuat transaksi");
        return;
      }
      window.location.href = `/billing/riwayat/${data.orderId}`;
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── STEP 1: NOMINAL ── */}
      <div className={cn("rounded-2xl border bg-card transition-all duration-300", step === 1 ? "border-primary/50 shadow-sm" : "border-border opacity-70")}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between cursor-pointer" onClick={() => setStep(1)}>
          <div className="flex items-center gap-3">
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold", step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</div>
            <h3 className="font-semibold text-foreground">Pilih Nominal</h3>
          </div>
          {step > 1 && resolvedAmount && (
            <span className="text-sm font-bold text-primary">{formatRp(resolvedAmount)}</span>
          )}
        </div>
        
        {step === 1 && (
          <div className="p-5 space-y-6">
            {/* Packages */}
            {packages.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Paket Pilihan</p>
                <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto pt-3 pb-4 sm:pb-1 snap-x hide-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
                  {packages.map((pkg, i) => {
                    const active = !isCustom && selectedPackage?.id === pkg.id;
                    const isPopular = i === 1; // Highlight middle package
                    const bonusPct = pkg.creditsAmount > pkg.priceIdr
                      ? Math.round(((pkg.creditsAmount - pkg.priceIdr) / pkg.priceIdr) * 100) : null;
                    const bonusText = pkg.bonusLabel ?? (bonusPct ? `+${bonusPct}%` : null);
                    
                    return (
                      <button
                        key={pkg.id}
                        onClick={() => pickPackage(pkg)}
                        className={cn(
                          "relative flex flex-col items-center justify-center text-center rounded-2xl p-4 transition-all border-2 flex-shrink-0 w-[200px] sm:w-auto snap-center",
                          active 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : isPopular 
                              ? "border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5" 
                              : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        {isPopular && !active && (
                          <div className="absolute -top-3 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                            POPULER
                          </div>
                        )}
                        {bonusText && (
                          <span className="mb-2 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                            {bonusText}
                          </span>
                        )}
                        <span className={cn("text-sm font-extrabold leading-tight mb-1", active ? "text-primary" : "text-foreground")}>
                          {pkg.name}
                        </span>
                        <span className={cn("text-xl font-black mb-1", active ? "text-primary" : "text-foreground")}>
                          {formatRp(pkg.priceIdr)}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full mt-1">
                          {pkg.creditsAmount >= 1000
                            ? `${(pkg.creditsAmount / 1000).toFixed(0)}rb cr`
                            : `${pkg.creditsAmount} cr`}
                        </span>
                        
                        {active && (
                          <div className="absolute -top-2 -right-2 bg-primary rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Presets */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Nominal Cepat</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((amount) => {
                    const activePreset = isCustom && !selectedPackage && parseInt(customRaw || "0") === amount;
                    const label = amount >= 1_000_000
                      ? `${amount / 1_000_000}jt`
                      : `${amount / 1_000}rb`;
                    return (
                      <button
                        key={amount}
                        onClick={() => pickPreset(amount)}
                        className={cn(
                          "rounded-xl py-2.5 text-xs font-semibold border transition-all",
                          activePreset
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        )}
                      >
                        Rp {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Nominal Lain</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none text-muted-foreground">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan nominal..."
                    value={isCustom && !selectedPackage && !PRESETS.includes(parseInt(customRaw || "0"))
                      ? (customRaw ? parseInt(customRaw).toLocaleString("id-ID") : "")
                      : ""}
                    onFocus={() => {
                      if (selectedPackage || !isCustom || PRESETS.includes(parseInt(customRaw || "0"))) {
                        setIsCustom(true);
                        setSelectedPackage(null);
                        setCustomRaw("");
                        setError(null);
                      }
                    }}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    className={cn(
                      "w-full h-[46px] rounded-xl pl-11 pr-10 text-sm font-bold bg-background text-foreground outline-none border-2 transition-all",
                      amountError
                        ? "border-destructive/50 focus:border-destructive"
                        : isCustom && !selectedPackage && !PRESETS.includes(parseInt(customRaw || "0")) && customRaw
                        ? "border-primary"
                        : "border-border focus:border-primary/50"
                    )}
                  />
                  {isCustom && !selectedPackage && customRaw && !PRESETS.includes(parseInt(customRaw)) && (
                    <button
                      onClick={() => { setIsCustom(false); setCustomRaw(""); setSelectedPackage(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {amountError && <p className="text-[11px] font-medium text-destructive mt-1.5 ml-1">{amountError}</p>}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className={cn(
                  "w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                  canAdvanceStep1
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Lanjutkan
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 2: METODE ── */}
      <div className={cn("rounded-2xl border bg-card transition-all duration-300", step === 2 ? "border-primary/50 shadow-sm" : "border-border", step < 2 && "opacity-50 pointer-events-none")}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between cursor-pointer" onClick={() => { if (step > 2 || canAdvanceStep1) setStep(2); }}>
          <div className="flex items-center gap-3">
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold", step === 2 ? "bg-primary text-primary-foreground" : (step > 2 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"))}>
              {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </div>
            <h3 className="font-semibold text-foreground">Metode Pembayaran</h3>
          </div>
          {step > 2 && method && (
            <span className="text-xs font-bold px-2.5 py-1 bg-muted rounded-full text-foreground">{selectedMethodLabel}</span>
          )}
        </div>
        
        {step === 2 && (
          <div className="p-5">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
              {chLoading && (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Memuat channel pembayaran...</span>
                </div>
              )}
              {chError && !chLoading && (
                <p className="text-sm text-center py-6 text-destructive font-medium bg-destructive/5 rounded-xl border border-destructive/20">{chError}</p>
              )}
              {!chLoading && channels.length > 0 && (() => {
                const ewallets = ["SP", "DA", "OVO", "SA", "LQ", "QRIS"];
                const availableChannels = channels.filter(c => {
                  if (resolvedAmount != null && resolvedAmount < 10000) {
                    return ewallets.includes(c.code) || c.name.toLowerCase().includes("qris") || c.name.toLowerCase().includes("shopee") || c.name.toLowerCase().includes("dana") || c.name.toLowerCase().includes("ovo") || c.name.toLowerCase().includes("linkaja");
                  }
                  return true;
                });

                if (availableChannels.length === 0) {
                  return <p className="text-sm text-center py-6 text-muted-foreground font-medium border border-dashed rounded-xl bg-muted/30">Tidak ada channel tersedia untuk nominal ini</p>;
                }

                const qris = availableChannels.find(c => c.code === "QRIS");
                const others = availableChannels.filter(c => c.code !== "QRIS");
                const groups: Record<string, PaymentChannel[]> = {};
                others.forEach(c => {
                  if (!groups[c.group]) groups[c.group] = [];
                  groups[c.group].push(c);
                });
                return (
                  <>
                    {qris && (() => {
                      const active = method === qris.code;
                      return (
                        <div className="mb-6">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-foreground/60 ml-1">Pembayaran Instan</p>
                          <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
                            <button
                              key={qris.code}
                              onClick={() => setMethod(qris.code)}
                              className={cn(
                                "w-full flex items-center justify-between p-4 transition-all text-left hover:bg-muted/50",
                                active && "bg-primary/5"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white border border-border/50 shadow-sm">
                                  <img src={qris.icon_url} alt={qris.name} className="h-8 w-8 object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{qris.name}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">GoPay · OVO · Dana · ShopeePay & e-wallet</p>
                                </div>
                              </div>
                              <div className={cn("h-5 w-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors", active ? "border-primary" : "border-muted-foreground/30")}>
                                {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {Object.entries(groups).map(([group, chs]) => (
                      <div key={group} className="mb-6 last:mb-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-foreground/60 ml-1">{group}</p>
                        <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm divide-y divide-border">
                          {chs.map((c) => {
                            const active = method === c.code;
                            return (
                              <button
                                key={c.code}
                                onClick={() => setMethod(c.code)}
                                className={cn(
                                  "w-full flex items-center justify-between p-4 transition-all text-left hover:bg-muted/50",
                                  active && "bg-primary/5"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 bg-white border border-border/50 p-1">
                                    <img src={c.icon_url} alt={c.name} className="h-full w-full object-contain"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  </div>
                                  <span className={cn("text-sm font-semibold truncate", active ? "text-primary" : "text-foreground")}>
                                    {c.name.replace(" Virtual Account", " VA")}
                                  </span>
                                </div>
                                <div className={cn("h-5 w-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors", active ? "border-primary" : "border-muted-foreground/30")}>
                                  {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            <div className="pt-4 mt-2 border-t border-border">
              <button
                onClick={() => setStep(3)}
                className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
              >
                Konfirmasi Pembayaran
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 3: KONFIRMASI ── */}
      <div className={cn("rounded-2xl border bg-card transition-all duration-300", step === 3 ? "border-primary/50 shadow-sm" : "border-border", step < 3 && "opacity-50 pointer-events-none")}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold", step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            3
          </div>
          <h3 className="font-semibold text-foreground">Selesaikan Pembayaran</h3>
        </div>
        
        {step === 3 && (
          <div className="p-5">
            <div className="rounded-xl border border-dashed bg-muted/30 p-5 space-y-4 mb-6">
              {selectedPackage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Paket</span>
                  <span className="text-sm font-bold text-foreground">{selectedPackage.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Nominal</span>
                <span className="text-sm font-bold text-foreground">{formatRp(resolvedAmount!)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Kredit didapat</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">+{resolvedCredits!.toLocaleString("id-ID")} cr</span>
              </div>
              {resolvedCredits !== resolvedAmount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Bonus kredit</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{(resolvedCredits! - resolvedAmount!).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Metode</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {selectedMethodLabel}
                </span>
              </div>
              <div className="border-t border-dashed border-border pt-4 mt-2" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">Total Bayar</span>
                <span className="text-2xl font-black text-foreground">{formatRp(resolvedAmount!)}</span>
              </div>
            </div>

            {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold rounded-xl text-center">{error}</div>}

            <button
              onClick={handlePay}
              disabled={loading || !resolvedAmount || !!amountError}
              className={cn(
                "w-full h-14 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all shadow-md",
                loading || !resolvedAmount || !!amountError
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                  : "bg-primary text-primary-foreground hover:scale-[1.02] hover:shadow-lg active:scale-95"
              )}
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Memproses Transaksi...</>
              ) : (
                <>Bayar Sekarang <span className="opacity-60 ml-1">·</span> {formatRp(resolvedAmount!)}</>
              )}
            </button>
            <p className="text-[11px] font-medium text-center text-muted-foreground mt-4">
              Kredit akan otomatis ditambahkan setelah pembayaran berhasil dikonfirmasi oleh sistem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentStatusBanner({ orderId, onDone }: { orderId: number; onDone: () => void }) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retries, setRetries] = useState(0);
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxAutoRetries = 6; 

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await csrfFetch(`/api/billing/orders/${orderId}/sync`, { method: "POST", credentials: "include" });
      if (!res.ok) return;
      const data = await res.json() as { status: OrderStatus; creditsAmount?: number };
      setStatus(data.status);
      if (data.status === "paid") {
        setCredits(data.creditsAmount ?? null);
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        onDone();
      }
    } catch {
    } finally {
      setSyncing(false);
    }
  }, [orderId, syncing, queryClient, onDone]);

  const autoPoll = useCallback(async (attempt: number) => {
    if (attempt > maxAutoRetries) {
      setTimedOut(true);
      return;
    }
    try {
      const res = await csrfFetch(`/api/billing/orders/${orderId}/sync`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { status: OrderStatus; creditsAmount?: number };
        setStatus(data.status);
        setRetries(attempt);
        if (data.status === "paid") {
          setCredits(data.creditsAmount ?? null);
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          onDone();
          return;
        }
        if (data.status === "pending") {
          timerRef.current = setTimeout(() => autoPoll(attempt + 1), 5000);
        }
      }
    } catch {
      timerRef.current = setTimeout(() => autoPoll(attempt + 1), 5000);
    }
  }, [orderId, queryClient, onDone]);

  useEffect(() => {
    autoPoll(1);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (status === "paid") {
    return (
      <div className="rounded-2xl px-6 py-5 flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 shadow-sm mb-6">
        <CheckCircle2 className="h-8 w-8 flex-shrink-0 text-emerald-500" />
        <div>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-500">Pembayaran berhasil!</p>
          <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">
            {credits !== null ? `${formatRp(credits)} kredit` : "Kredit"} sudah ditambahkan ke akunmu.
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" || status === "expired") {
    return (
      <div className="rounded-2xl px-6 py-5 flex items-center gap-4 bg-red-500/10 border border-red-500/20 shadow-sm mb-6">
        <AlertCircle className="h-8 w-8 flex-shrink-0 text-red-500" />
        <div>
          <p className="text-base font-bold text-red-600 dark:text-red-500">Pembayaran {status === "expired" ? "kadaluarsa" : "gagal"}</p>
          <p className="text-sm font-medium text-red-600/80 dark:text-red-500/80 mt-0.5">Silakan buat topup baru.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-orange-500/10 border border-orange-500/20 shadow-sm mb-6">
      <div className="flex items-center gap-4">
        <RefreshCw className={cn("h-7 w-7 flex-shrink-0 text-orange-500", !timedOut && "animate-spin")} />
        <div>
          <p className="text-base font-bold text-orange-600 dark:text-orange-500">
            {timedOut ? "Menunggu konfirmasi otomatis" : "Mengecek pembayaran..."}
          </p>
          <p className="text-sm font-medium text-orange-600/80 dark:text-orange-500/80 mt-0.5">
            {timedOut
              ? "Jika sudah bayar, klik tombol cek secara manual."
              : `Menghubungi Duitku${retries > 0 ? ` (cek ke-${retries})` : ""}...`}
          </p>
        </div>
      </div>
      <button
        onClick={syncNow}
        disabled={syncing}
        className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all border border-orange-500/40 text-orange-600 dark:text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Sedang Mengecek...</> : <><RefreshCw className="h-4 w-4" /> Cek Sekarang</>}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pollDone, setPollDone] = useState(false);

  // Detect return from Duitku via orderId=xx URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    if (orderId) {
      const id = parseInt(orderId, 10);
      if (!isNaN(id)) {
        setPendingOrderId(id);
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }
    }
  }, []);

  const credits = user?.credits ?? 0;

  return (
    <div className="max-w-[1400px] mx-auto pb-12">
      {/* Header Halaman */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground tracking-tight">Kredit & Topup</h1>
        <p className="text-sm font-medium text-muted-foreground mt-2">Isi ulang saldo kredit untuk menggunakan layanan hosting dan AI.</p>
      </div>

      {/* Status Banner */}
      {pendingOrderId && !pollDone && (
        <PaymentStatusBanner
          orderId={pendingOrderId}
          onDone={() => setPollDone(true)}
        />
      )}

      {/* Grid 2-Kolom (Form Kiri, Sidebar Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Kolom Kiri: Topup Form (col-span 7 atau 8) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <TopupSection />
        </div>

        {/* Kolom Kanan: Sidebar (col-span 5 atau 4) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-6">
          {/* Kartu Kredit */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground px-1">Saldo Anda</h3>
            <CreditCard credits={credits} userName={user?.name} />
          </div>

          {/* Riwayat Transaksi Ringkas */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Transaksi Terakhir</h3>
            </div>
            <div className="p-4">
              <RecentOrders />
            </div>
            <div className="p-3 border-t border-border bg-muted/10">
              <Link href="/billing/riwayat">
                <button className="w-full h-10 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center justify-center gap-1.5">
                  Lihat Semua Riwayat
                  <ChevronRight className="h-3 w-3" />
                </button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
