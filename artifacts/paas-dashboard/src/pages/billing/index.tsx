import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListTransactions, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Wallet, Zap, ArrowUpCircle, Clock, TrendingUp,
  CreditCard, Loader2, PenLine, X, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";

const PRESETS = [3_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000];

const PAYMENT_METHODS = [
  { id: "QRIS",      label: "QRIS" },
  { id: "BRIVA",     label: "BRI VA" },
  { id: "BNIVA",     label: "BNI VA" },
  { id: "MANDIRIVA", label: "Mandiri VA" },
  { id: "BCAVA",     label: "BCA VA" },
  { id: "BSIVA",     label: "BSI VA" },
];

const MIN = 10;
const MAX = 10_000_000;

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
function shortRp(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}jt`;
  if (n >= 1_000) return `${n / 1_000}rb`;
  return String(n);
}
function creditColor(credits: number) {
  if (credits === 0) return "rgb(239,68,68)";
  if (credits <= 1000) return "rgb(234,179,8)";
  return "rgb(34,197,94)";
}
function planStyle(plan?: string) {
  if (plan === "team") return { name: "Team", color: "rgba(139,92,246,0.8)" };
  if (plan === "pro") return { name: "Pro", color: "rgb(249,115,22)" };
  return { name: "Hobby", color: "rgba(255,255,255,0.4)" };
}

type OrderStatus = "pending" | "paid" | "failed" | "expired";

interface OrderPollResult {
  id: number;
  status: OrderStatus;
  creditsAmount: number;
  paymentUrl?: string | null;
}

function TopupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customRaw, setCustomRaw] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [method, setMethod] = useState("QRIS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedAmount = (() => {
    if (isCustom) {
      const n = parseInt(customRaw.replace(/\D/g, ""), 10);
      return Number.isNaN(n) ? null : n;
    }
    return selectedPreset;
  })();

  const amountError = (() => {
    if (!resolvedAmount) return null;
    if (resolvedAmount < MIN) return `Minimal ${formatRp(MIN)}`;
    if (resolvedAmount > MAX) return `Maksimal ${formatRp(MAX)}`;
    return null;
  })();

  const canPay = resolvedAmount !== null && !amountError && !loading;

  function handleCustomInput(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setCustomRaw(digits);
    setSelectedPreset(null);
    setError(null);
  }

  function pickPreset(val: number) {
    setSelectedPreset(val);
    setIsCustom(false);
    setCustomRaw("");
    setError(null);
  }

  function openCustom() {
    setIsCustom(true);
    setSelectedPreset(null);
    setError(null);
  }

  async function handlePay() {
    if (!canPay || !resolvedAmount) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/tripay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: resolvedAmount, method }),
      });
      const data = await res.json() as { paymentUrl?: string; error?: string; orderId?: number };
      if (!res.ok || !data.paymentUrl) {
        setError(data.error ?? "Gagal membuat transaksi");
        return;
      }
      onClose();
      // Redirect tab ini ke Tripay — saat user selesai bayar, Tripay redirect balik ke return_url
      // yang sudah ada orderId param, sehingga billing page bisa polling status
      window.location.href = data.paymentUrl;
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden gap-0"
        style={{
          background: "rgb(10,10,12)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-sm font-semibold">Topup Kredit</DialogTitle>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: "rgba(249,115,22,0.12)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.2)" }}
            >
              via Tripay
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Nominal */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Pilih nominal</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((val) => {
                const active = !isCustom && selectedPreset === val;
                return (
                  <button
                    key={val}
                    onClick={() => pickPreset(val)}
                    className="rounded-xl py-2.5 text-sm font-semibold transition-all"
                    style={{
                      border: active ? "1px solid rgba(249,115,22,0.7)" : "1px solid rgba(255,255,255,0.09)",
                      background: active ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)",
                      color: active ? "rgb(249,115,22)" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {shortRp(val)}
                  </button>
                );
              })}
            </div>

            {!isCustom ? (
              <button
                onClick={openCustom}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all"
                style={{ border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
              >
                <PenLine className="h-3.5 w-3.5" />
                Nominal lain (custom)
              </button>
            ) : (
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Rp
                </span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={customRaw ? parseInt(customRaw).toLocaleString("id-ID") : ""}
                  onChange={(e) => handleCustomInput(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-10 py-3 text-sm font-bold bg-transparent outline-none"
                  style={{
                    border: amountError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(249,115,22,0.5)",
                    color: "white",
                  }}
                />
                <button
                  onClick={() => { setIsCustom(false); setCustomRaw(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {amountError ? (
              <p className="text-xs text-red-400">{amountError}</p>
            ) : resolvedAmount && resolvedAmount >= MIN ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Kamu akan mendapat{" "}
                <span className="font-bold" style={{ color: "rgb(34,197,94)" }}>
                  {resolvedAmount.toLocaleString("id-ID")} kredit
                </span>
              </p>
            ) : null}
          </div>

          {/* Metode */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Metode pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className="rounded-lg px-2 py-2 text-xs font-medium transition-all text-center"
                    style={{
                      border: active ? "1px solid rgba(249,115,22,0.6)" : "1px solid rgba(255,255,255,0.08)",
                      background: active ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.025)",
                      color: active ? "rgb(249,115,22)" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handlePay}
            disabled={!canPay}
            className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: canPay ? "rgb(249,115,22)" : "rgba(255,255,255,0.06)",
              color: canPay ? "white" : "rgba(255,255,255,0.25)",
              cursor: canPay ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
            ) : resolvedAmount && resolvedAmount >= MIN ? (
              <>Bayar {formatRp(resolvedAmount)} via {method}</>
            ) : (
              "Pilih nominal terlebih dahulu"
            )}
          </button>

          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            Kredit otomatis masuk setelah pembayaran dikonfirmasi · 1 kredit = Rp 1
          </p>
        </div>
      </DialogContent>
    </Dialog>
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
  const maxAutoRetries = 6; // 30 detik auto-poll, lalu tunggu user klik manual

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/billing/orders/${orderId}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json() as { status: OrderStatus; creditsAmount?: number };
      setStatus(data.status);
      if (data.status === "paid") {
        setCredits(data.creditsAmount ?? null);
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        onDone();
      }
    } catch {
      // ignore
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
      const res = await fetch(`/api/billing/orders/${orderId}/sync`, {
        method: "POST",
        credentials: "include",
      });
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
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: "rgb(34,197,94)" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "rgb(34,197,94)" }}>Pembayaran berhasil!</p>
          <p className="text-xs text-muted-foreground">
            {credits !== null ? `${formatRp(credits)} kredit` : "Kredit"} sudah ditambahkan ke akunmu.
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" || status === "expired") {
    return (
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-400">Pembayaran {status === "expired" ? "kadaluarsa" : "gagal"}</p>
          <p className="text-xs text-muted-foreground">Coba topup lagi jika perlu.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-5 py-4 flex items-start justify-between gap-4"
      style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)" }}
    >
      <div className="flex items-start gap-3">
        <RefreshCw
          className={`h-5 w-5 flex-shrink-0 mt-0.5 ${!timedOut ? "animate-spin" : ""}`}
          style={{ color: "rgb(249,115,22)" }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: "rgb(249,115,22)" }}>
            {timedOut ? "Pembayaran belum terkonfirmasi otomatis" : "Menunggu konfirmasi pembayaran…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {timedOut
              ? "Kalau sudah bayar, klik \"Cek Sekarang\" untuk memperbarui status secara manual."
              : `Server sedang mengecek status ke Tripay${retries > 0 ? ` (cek ke-${retries})` : ""}…`}
          </p>
        </div>
      </div>
      <button
        onClick={syncNow}
        disabled={syncing}
        className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
        style={{
          border: "1px solid rgba(249,115,22,0.4)",
          color: syncing ? "rgba(249,115,22,0.4)" : "rgb(249,115,22)",
          background: "rgba(249,115,22,0.08)",
          cursor: syncing ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {syncing
          ? <><Loader2 className="h-3 w-3 animate-spin" /> Mengecek…</>
          : <><RefreshCw className="h-3 w-3" /> Cek Sekarang</>}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const { data: transactions, isLoading: txLoading } = useListTransactions();
  const [topupOpen, setTopupOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pollDone, setPollDone] = useState(false);

  // Detect return from Tripay via ?orderId=xxx URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    if (orderId) {
      const id = parseInt(orderId, 10);
      if (!isNaN(id)) {
        setPendingOrderId(id);
        // Strip orderId from URL without reload
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }
    }
  }, []);

  const credits = user?.credits ?? 0;
  const plan = planStyle(user?.plan);
  const pct = Math.min(100, Math.round((credits / 5000) * 100));

  return (
    <div className="space-y-4">
      <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />

      {/* Payment status banner */}
      {pendingOrderId && !pollDone && (
        <PaymentStatusBanner
          orderId={pendingOrderId}
          onDone={() => setPollDone(true)}
        />
      )}

      {/* ── Kartu Mution ── */}
      <div className="w-full max-w-sm mx-auto sm:max-w-none">
        {/* Card */}
        <div
          className="relative w-full rounded-2xl overflow-hidden select-none"
          style={{
            aspectRatio: "1.7 / 1",
            background: "linear-gradient(135deg, rgb(13,12,17) 0%, rgb(20,17,26) 55%, rgb(16,14,22) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          {/* ── Background: dot grid ── */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.18 }}>
            <defs>
              <pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.5)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotgrid)" />
          </svg>

          {/* ── Orange glow top-left ── */}
          <div className="absolute pointer-events-none" style={{
            top: "-40%", left: "-20%",
            width: "65%", height: "140%",
            background: "radial-gradient(ellipse, rgba(249,115,22,0.13) 0%, transparent 65%)",
          }} />

          {/* ── Decorative circles — bottom right (subtle Mastercard vibe) ── */}
          <div className="absolute" style={{ bottom: "-18%", right: "-6%", opacity: 0.12 }}>
            <svg width="160" height="120" viewBox="0 0 160 120">
              <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(249,115,22,1)" strokeWidth="1" />
              <circle cx="100" cy="60" r="55" fill="none" stroke="rgba(249,115,22,1)" strokeWidth="1" />
            </svg>
          </div>
          <div className="absolute" style={{ bottom: "-10%", right: "0%", opacity: 0.07 }}>
            <svg width="120" height="90" viewBox="0 0 120 90">
              <circle cx="45" cy="45" r="40" fill="rgba(249,115,22,0.6)" />
              <circle cx="75" cy="45" r="40" fill="rgba(249,115,22,0.6)" />
            </svg>
          </div>

          {/* ── Card content ── */}
          <div className="absolute inset-0 flex flex-col justify-between p-[6%]">

            {/* Top row */}
            <div className="flex items-start justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <img src="/mution-logo.png" alt="Mution" className="h-6 w-auto brightness-110" />
                <span className="font-extrabold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(13px, 2vw, 18px)" }}>
                  Mution
                </span>
              </div>

              {/* Plan badge */}
              <span
                className="font-bold uppercase tracking-widest"
                style={{
                  fontSize: "clamp(8px, 1.2vw, 11px)",
                  color: plan.color,
                  border: `1px solid ${plan.color}44`,
                  background: `${plan.color}18`,
                  padding: "2px 8px",
                  borderRadius: "99px",
                  letterSpacing: "0.14em",
                }}
              >
                {plan.name}
              </span>
            </div>

            {/* Chip + balance */}
            <div className="flex flex-col gap-[5%]">
              {/* EMV Chip */}
              <div style={{ width: "clamp(28px, 5%, 42px)" }}>
                <svg viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
                  <rect width="42" height="32" rx="4" fill="#b8960c" />
                  <rect x="1" y="1" width="40" height="30" rx="3.2" fill="url(#chipGold)" />
                  {/* Grid lines */}
                  <line x1="14" y1="1" x2="14" y2="31" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
                  <line x1="28" y1="1" x2="28" y2="31" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
                  <line x1="1" y1="11" x2="41" y2="11" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
                  <line x1="1" y1="21" x2="41" y2="21" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
                  {/* Center contact */}
                  <rect x="14.5" y="11.5" width="13" height="9" rx="1.5" fill="rgba(0,0,0,0.18)" />
                  <defs>
                    <linearGradient id="chipGold" x1="0" y1="0" x2="42" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#e8c55a" />
                      <stop offset="40%" stopColor="#d4a827" />
                      <stop offset="100%" stopColor="#b8960c" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Balance */}
              <div>
                <p className="text-white/40 font-medium mb-0.5" style={{ fontSize: "clamp(8px, 1.1vw, 11px)", letterSpacing: "0.08em" }}>
                  SALDO TERSEDIA
                </p>
                <p
                  className="font-extrabold tabular-nums tracking-tight leading-none"
                  style={{ fontSize: "clamp(18px, 3.5vw, 34px)", color: creditColor(credits) }}
                >
                  {formatRp(credits)}
                </p>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/35 font-medium mb-0.5" style={{ fontSize: "clamp(7px, 1vw, 10px)", letterSpacing: "0.1em" }}>
                  PEMEGANG KARTU
                </p>
                <p className="text-white font-semibold truncate max-w-[180px]" style={{ fontSize: "clamp(10px, 1.6vw, 14px)", letterSpacing: "0.04em" }}>
                  {(user?.name ?? "—").toUpperCase()}
                </p>
              </div>
              <p className="text-white/25 font-bold tracking-widest" style={{ fontSize: "clamp(7px, 1vw, 10px)", letterSpacing: "0.2em" }}>
                DEBIT
              </p>
            </div>
          </div>
        </div>

        {/* ── Actions + info di bawah kartu ── */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTopupOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 transition-all"
              style={{
                border: "1px solid rgba(249,115,22,0.4)",
                color: "rgba(249,115,22,0.9)",
                background: "rgba(249,115,22,0.08)",
              }}
            >
              <CreditCard className="h-4 w-4" />
              Topup Saldo
            </button>

            {plan.name === "Hobby" && (
              <Link href="/harga">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 h-auto"
                  style={{
                    border: "1px solid rgba(139,92,246,0.4)",
                    color: "rgba(139,92,246,0.9)",
                    background: "rgba(139,92,246,0.08)",
                  }}
                >
                  <TrendingUp className="h-4 w-4" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Plan</span>
            <span className="text-xs font-bold" style={{ color: plan.color }}>{plan.name}</span>
            <Link href="/harga">
              <span className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer">
                Lihat plan →
              </span>
            </Link>
          </div>
        </div>

        {/* ── Credit bar ── */}
        <div className="mt-3">
          <div className="w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: creditColor(credits) }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-1.5">
            {credits === 0
              ? "Kredit habis — proyek dihentikan."
              : credits <= 1000
              ? "Kredit hampir habis — segera topup."
              : `${formatRp(credits)} tersedia`}
          </p>
        </div>
      </div>

      {/* ── Riwayat Transaksi ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Riwayat Transaksi</p>
        </div>

        {txLoading ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="px-6 py-10 flex flex-col items-center text-center gap-2">
            <Clock className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground/50">Riwayat topup dan penggunaan kredit akan muncul di sini.</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: i < transactions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: tx.type === "topup" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                      border: tx.type === "topup" ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(239,68,68,0.15)",
                    }}
                  >
                    <ArrowUpCircle
                      className="h-3.5 w-3.5"
                      style={{
                        color: tx.type === "topup" ? "rgb(34,197,94)" : "rgb(239,68,68)",
                        transform: tx.type === "topup" ? "none" : "rotate(180deg)",
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.note ?? (tx.type === "topup" ? "Topup" : "Penggunaan")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: tx.type === "topup" ? "rgb(34,197,94)" : "rgb(239,68,68)" }}
                >
                  {tx.type === "topup" ? "+" : "-"}{formatRp(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
