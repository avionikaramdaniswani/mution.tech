import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListTransactions, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Wallet, Zap, ArrowUpCircle, Clock, TrendingUp,
  CreditCard, Loader2, PenLine, X, CheckCircle2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Lock,
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

// ── Plan card configs ──────────────────────────────────────────────────────
const PLAN_CARDS = [
  {
    id: "hobby",
    name: "Hobby",
    tagline: "Mulai dari sini",
    bg: "linear-gradient(140deg, #0d0e12 0%, #13141a 60%, #0f1016 100%)",
    accent: "#94a3b8",
    accentRgb: "148,163,184",
    glowColor: "rgba(148,163,184,0.07)",
    chipFrom: "#c0c8d4", chipMid: "#8896a8", chipTo: "#5a6a7e",
    circleA: "rgba(148,163,184,0.1)", circleB: "rgba(100,116,139,0.07)",
    borderColor: "rgba(148,163,184,0.14)",
    PatternEl: () => (
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.12 }}>
        <defs>
          <pattern id="ph" x="0" y="0" width="1" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="1000" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ph)" />
      </svg>
    ),
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Untuk developer serius",
    bg: "linear-gradient(140deg, #0e0b07 0%, #1a1008 60%, #110d06 100%)",
    accent: "#f97316",
    accentRgb: "249,115,22",
    glowColor: "rgba(249,115,22,0.11)",
    chipFrom: "#e8c55a", chipMid: "#d4a827", chipTo: "#b8960c",
    circleA: "rgba(249,115,22,0.13)", circleB: "rgba(249,115,22,0.07)",
    borderColor: "rgba(249,115,22,0.18)",
    PatternEl: () => (
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
        <defs>
          <pattern id="pp" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.55)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pp)" />
      </svg>
    ),
  },
  {
    id: "team",
    name: "Team",
    tagline: "Untuk tim profesional",
    bg: "linear-gradient(140deg, #09080f 0%, #110d1e 60%, #0d0a18 100%)",
    accent: "#8b5cf6",
    accentRgb: "139,92,246",
    glowColor: "rgba(139,92,246,0.11)",
    chipFrom: "#c4b5fd", chipMid: "#a78bfa", chipTo: "#7c3aed",
    circleA: "rgba(139,92,246,0.14)", circleB: "rgba(109,40,217,0.07)",
    borderColor: "rgba(139,92,246,0.18)",
    PatternEl: () => (
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
        <defs>
          <pattern id="pt" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <line x1="0" y1="28" x2="28" y2="0" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pt)" />
      </svg>
    ),
  },
] as const;

type PlanCardConfig = typeof PLAN_CARDS[number];

function PlanCard({
  cfg, isCurrentPlan, isUnlocked, credits, userName,
}: {
  cfg: PlanCardConfig;
  isCurrentPlan: boolean;
  isUnlocked: boolean;
  credits: number;
  userName?: string;
}) {
  const { PatternEl } = cfg;
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: "1.586 / 1",
        background: cfg.bg,
        border: `1px solid ${cfg.borderColor}`,
        boxShadow: isCurrentPlan
          ? `0 20px 60px rgba(0,0,0,0.55), 0 0 40px ${cfg.glowColor}`
          : isUnlocked
          ? `0 12px 32px rgba(0,0,0,0.45), 0 0 20px ${cfg.glowColor}`
          : "0 8px 24px rgba(0,0,0,0.4)",
        filter: isUnlocked ? "none" : "grayscale(60%) brightness(0.55)",
        transition: "filter 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Pattern */}
      <PatternEl />

      {/* Glow */}
      <div className="absolute pointer-events-none" style={{
        top: "-50%", left: "-25%", width: "70%", height: "150%",
        background: `radial-gradient(ellipse, ${cfg.glowColor.replace("0.11","0.18")} 0%, transparent 65%)`,
      }} />

      {/* Decorative circles — bottom right */}
      <div className="absolute" style={{ bottom: "-20%", right: "-8%", opacity: 0.9 }}>
        <svg width="110" height="90" viewBox="0 0 110 90">
          <circle cx="38" cy="45" r="38" fill="none" stroke={cfg.circleA} strokeWidth="1" />
          <circle cx="72" cy="45" r="38" fill="none" stroke={cfg.circleA} strokeWidth="1" />
          <circle cx="38" cy="45" r="38" fill={cfg.circleB} />
          <circle cx="72" cy="45" r="38" fill={cfg.circleB} />
        </svg>
      </div>

      {/* Card content */}
      <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
        {/* Top: logo + plan badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <img src="/mution-logo.png" alt="" className="h-5 w-auto brightness-110" />
            <span className="font-extrabold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14 }}>
              Mution
            </span>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
            color: cfg.accent, border: `1px solid ${cfg.accent}44`,
            background: `${cfg.accent}1a`, padding: "2px 7px", borderRadius: 99,
          }}>
            {cfg.name.toUpperCase()}
          </span>
        </div>

        {/* Middle: chip */}
        <div style={{ width: 34 }}>
          <svg viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
            <rect width="42" height="32" rx="4" fill={cfg.chipTo} />
            <defs>
              <linearGradient id={`cg-${cfg.id}`} x1="0" y1="0" x2="42" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={cfg.chipFrom} />
                <stop offset="45%" stopColor={cfg.chipMid} />
                <stop offset="100%" stopColor={cfg.chipTo} />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="40" height="30" rx="3.2" fill={`url(#cg-${cfg.id})`} />
            <line x1="14" y1="1" x2="14" y2="31" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <line x1="28" y1="1" x2="28" y2="31" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <line x1="1" y1="11" x2="41" y2="11" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <line x1="1" y1="21" x2="41" y2="21" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" />
            <rect x="14.5" y="11.5" width="13" height="9" rx="1.5" fill="rgba(0,0,0,0.16)" />
          </svg>
        </div>

        {/* Bottom: balance (current plan) or tagline + name */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {isCurrentPlan ? (
              <>
                <p style={{ fontSize: 8, letterSpacing: "0.1em", color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>
                  SALDO TERSEDIA
                </p>
                <p className="font-extrabold tabular-nums leading-none" style={{ fontSize: 20, color: creditColor(credits) }}>
                  {formatRp(credits)}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 8, letterSpacing: "0.1em", color: isUnlocked ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.28)", marginBottom: 2 }}>
                  {isUnlocked ? "TERMASUK" : "PLAN"}
                </p>
                <p className="font-semibold leading-none" style={{ fontSize: 12, color: isUnlocked ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)" }}>
                  {cfg.tagline}
                </p>
              </>
            )}
            <p className="font-semibold truncate mt-2" style={{ fontSize: 10, letterSpacing: "0.05em", color: "rgba(255,255,255,0.35)" }}>
              {isCurrentPlan ? (userName ?? "—").toUpperCase() : "— — — — — —"}
            </p>
          </div>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
            DEBIT
          </p>
        </div>
      </div>

      {/* Lock overlay — only for plans above current tier */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
          style={{ background: "rgba(0,0,0,0.18)" }}>
          <div className="rounded-full p-2" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Lock className="h-4 w-4" style={{ color: "rgba(255,255,255,0.35)" }} />
          </div>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", fontWeight: 600 }}>
            BELUM DIAKTIFKAN
          </p>
        </div>
      )}
    </div>
  );
}

// ── End plan card ───────────────────────────────────────────────────────────

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

  const userPlanIndex = PLAN_CARDS.findIndex((p) => p.id === (user?.plan ?? "hobby"));
  const [cardIndex, setCardIndex] = useState(userPlanIndex === -1 ? 0 : userPlanIndex);
  const prevCard = () => setCardIndex((i) => (i - 1 + PLAN_CARDS.length) % PLAN_CARDS.length);
  const nextCard = () => setCardIndex((i) => (i + 1) % PLAN_CARDS.length);
  const currentCard = PLAN_CARDS[cardIndex];
  const isCurrentPlan = currentCard.id === (user?.plan ?? "hobby");
  const isUnlocked = cardIndex <= (userPlanIndex === -1 ? 0 : userPlanIndex);

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

      {/* ── Card Carousel ── */}
      <div className="flex flex-col items-center gap-3">

        {/* Carousel row */}
        <div className="flex items-center gap-3 w-full max-w-xs sm:max-w-sm md:max-w-md">
          {/* Prev */}
          <button
            onClick={prevCard}
            className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Card */}
          <div className="flex-1">
            <PlanCard
              cfg={currentCard}
              isCurrentPlan={isCurrentPlan}
              isUnlocked={isUnlocked}
              credits={credits}
              userName={user?.name}
            />
          </div>

          {/* Next */}
          <button
            onClick={nextCard}
            className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {PLAN_CARDS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCardIndex(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === cardIndex ? 16 : 6,
                height: 6,
                background: i === cardIndex ? currentCard.accent : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

        {/* Plan label */}
        <p className="text-xs font-medium" style={{ color: isCurrentPlan ? currentCard.accent : isUnlocked ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)" }}>
          {isCurrentPlan ? `Plan aktif kamu · ${currentCard.name}` : isUnlocked ? `${currentCard.name} · termasuk di plan kamu` : `${currentCard.name} — belum diaktifkan`}
        </p>
      </div>

      {/* ── Wallet panel ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #111318 0%, #0d0f14 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Balance display */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Saldo Tersedia
              </p>
              <p
                className="font-extrabold tabular-nums leading-none"
                style={{
                  fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
                  color: creditColor(credits),
                  textShadow: credits > 0 ? `0 0 32px ${creditColor(credits)}55` : "none",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatRp(credits)}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 mt-1"
              style={{
                background: plan.color.replace("0.8", "0.1").replace("rgb(", "rgba(").replace(")", ", 0.1)"),
                border: `1px solid ${plan.color.replace("0.8", "0.2")}`,
              }}
            >
              <span className="text-[11px] font-bold" style={{ color: plan.color }}>
                {plan.name}
              </span>
            </div>
          </div>

          {/* Credit bar */}
          <div className="space-y-1.5">
            <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: credits === 0
                    ? "rgb(239,68,68)"
                    : credits <= 1000
                    ? "linear-gradient(90deg, rgb(234,179,8), rgb(249,115,22))"
                    : "linear-gradient(90deg, rgb(34,197,94), rgb(16,185,129))",
                  boxShadow: credits > 0 ? `0 0 8px ${creditColor(credits)}66` : "none",
                }}
              />
            </div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              {credits === 0
                ? "⚠ Kredit habis — proyek dihentikan"
                : credits <= 1000
                ? "⚠ Kredit hampir habis — segera topup"
                : `${pct}% dari 5.000 kredit target · 1 kredit = Rp 1`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            onClick={() => setTopupOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgb(249,115,22) 0%, rgb(234,88,12) 100%)",
              boxShadow: "0 4px 20px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              color: "#fff",
            }}
          >
            <Wallet className="h-4 w-4" />
            Topup Saldo
          </button>
          {plan.name !== "Team" && (
            <Link href="/harga" className="flex-1">
              <button
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "rgb(167,139,250)",
                  boxShadow: "0 2px 12px rgba(139,92,246,0.12)",
                }}
              >
                <TrendingUp className="h-4 w-4" />
                Upgrade Plan
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Riwayat Transaksi ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0d0f14" }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">Riwayat Transaksi</p>
          </div>
          {transactions && transactions.length > 0 && (
            <span className="text-xs tabular-nums px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
              {transactions.length} entri
            </span>
          )}
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat…
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Clock className="h-6 w-6" style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Belum ada transaksi</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Riwayat topup dan penggunaan kredit muncul di sini</p>
            </div>
          </div>
        ) : (
          <div>
            {transactions.map((tx, i) => {
              const isTopup = tx.type === "topup";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: i < transactions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                >
                  {/* Icon badge */}
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isTopup ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                      border: isTopup ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.18)",
                    }}
                  >
                    <ArrowUpCircle
                      className="h-4 w-4"
                      style={{
                        color: isTopup ? "rgb(34,197,94)" : "rgb(239,68,68)",
                        transform: isTopup ? "none" : "rotate(180deg)",
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.note ?? (isTopup ? "Topup Saldo" : "Penggunaan Kredit")}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: isTopup ? "rgb(34,197,94)" : "rgb(239,68,68)" }}
                    >
                      {isTopup ? "+" : "−"}{formatRp(tx.amount)}
                    </span>
                    <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.2)" }}>
                      {isTopup ? "masuk" : "keluar"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
