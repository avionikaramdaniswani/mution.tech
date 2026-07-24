import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Zap, Loader2, PenLine, X, CheckCircle2, AlertCircle, RefreshCw, Lock,
} from "lucide-react";
import { Link } from "wouter";
import { csrfFetch } from "@/lib/csrf";

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

// -- Plan card configs ------------------------------------------------------
const PLAN_PERKS: Record<string, string[]> = {
  hobby: [
    "2 slot deploy proyek",
    "RAM 256 MB - 1 GB",
    "5.000 kredit saat daftar",
  ],
  pro: [
    "Unlimited slot proyek",
    "RAM hingga 4 GB",
    "Priority support",
    "25.000 kredit per siklus, rollover saat upgrade",
  ],
  team: [
    "Unlimited slot proyek",
    "Multi user",
    "Shared proyek",
    "Priority support",
    "60.000 kredit per siklus, rollover saat upgrade",
  ],
};

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

      {/* Decorative circles - bottom right */}
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
              {isCurrentPlan ? (userName ?? "-").toUpperCase() : "- - - - - -"}
            </p>
          </div>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
            DEBIT
          </p>
        </div>
      </div>

      {/* Lock overlay - only for plans above current tier */}
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

// -- End plan card -----------------------------------------------------------

type OrderStatus = "pending" | "paid" | "failed" | "expired";

interface OrderPollResult {
  id: number;
  status: OrderStatus;
  creditsAmount: number;
  paymentUrl?: string | null;
}

function TopupSection() {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [customRaw, setCustomRaw] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [method, setMethod] = useState("QRIS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { channels, loading: chLoading, error: chError } = usePaymentChannels();
  const packages = usePackages();

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
      const res = await csrfFetch("/api/billing/tripay/create", {
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
      window.location.href = data.paymentUrl;
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  const STEP_LABELS = ["Nominal", "Metode", "Konfirmasi"];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* -- Header -- */}
      <div className="px-5 pt-5 pb-4">
        {/* Title row + back arrow when step > 1 */}
        <div className="flex items-center gap-2.5 mb-4">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              aria-label="Kembali"
              className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 border border-border bg-muted hover:bg-muted/70 transition-colors text-muted-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
          <p className="text-sm font-semibold text-foreground flex-1">Topup Kredit</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-start">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const done = num < step;
            const active = num === step;
            return (
              <div key={i} className="flex items-start" style={{ flex: i < 2 ? 1 : undefined }}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary/10 border border-primary/50 text-primary"
                        : "bg-muted border border-border text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : num}
                  </div>
                  <span className={`text-[9px] font-medium ${active ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className={`flex-1 h-px mt-3 mx-2 transition-all duration-500 ${done ? "bg-primary/30" : "bg-border"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border mx-5" />

      {/* -- Step content -- */}
      <div className="px-5 py-4">

        {/* Step 1 - Pilih Paket */}
        {step === 1 && (
          <div className="space-y-2">
            {packages.length > 0 && packages.map((pkg) => {
              const active = !isCustom && selectedPackage?.id === pkg.id;
              const bonusPct = pkg.creditsAmount > pkg.priceIdr
                ? Math.round(((pkg.creditsAmount - pkg.priceIdr) / pkg.priceIdr) * 100) : null;
              const bonusText = pkg.bonusLabel ?? (bonusPct ? `+${bonusPct}% bonus` : null);
              return (
                <button
                  key={pkg.id}
                  onClick={() => pickPackage(pkg)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all text-left border ${
                    active
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                        {pkg.name}
                      </span>
                      {bonusText && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                          {bonusText}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pkg.creditsAmount.toLocaleString("id-ID")} kredit
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                      {formatRp(pkg.priceIdr)}
                    </p>
                  </div>
                  {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}

            {/* Custom nominal */}
            {!isCustom ? (
              <button
                onClick={() => { setIsCustom(true); setSelectedPackage(null); setError(null); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium border border-dashed border-border text-muted-foreground hover:bg-muted/50 transition-all"
              >
                <PenLine className="h-3.5 w-3.5" /> Nominal sendiri
              </button>
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none text-muted-foreground">Rp</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={customRaw ? parseInt(customRaw).toLocaleString("id-ID") : ""}
                  onChange={(e) => handleCustomInput(e.target.value)}
                  className={`w-full rounded-xl pl-10 pr-10 py-3 text-sm font-bold bg-background text-foreground outline-none border ${
                    amountError ? "border-destructive/50" : "border-primary/40 focus:border-primary/70"
                  }`}
                />
                <button
                  onClick={() => { setIsCustom(false); setCustomRaw(""); setSelectedPackage(null); }}
                  aria-label="Hapus nominal"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="h-4">
              {amountError && <p className="text-xs text-destructive">{amountError}</p>}
            </div>
          </div>
        )}

        {/* Step 2 - Metode */}
        {step === 2 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {chLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Memuat channel...</span>
              </div>
            )}
            {chError && !chLoading && (
              <p className="text-xs text-center py-4 text-destructive">{chError}</p>
            )}
            {!chLoading && !chError && channels.length === 0 && (
              <p className="text-xs text-center py-4 text-muted-foreground">Tidak ada channel tersedia</p>
            )}
            {!chLoading && channels.length > 0 && (() => {
              const qris = channels.find(c => c.code === "QRIS");
              const others = channels.filter(c => c.code !== "QRIS");
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
                      <button
                        key={qris.code}
                        onClick={() => setMethod(qris.code)}
                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all text-left border ${
                          active ? "border-primary/40 bg-primary/5" : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-muted border border-border">
                          <img src={qris.icon_url} alt={qris.name} className="h-7 w-7 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{qris.name}</p>
                          <p className="text-[10px] text-muted-foreground">GoPay · OVO · Dana · ShopeePay & semua e-wallet</p>
                        </div>
                        {active && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />}
                      </button>
                    );
                  })()}

                  {Object.entries(groups).map(([group, chs]) => (
                    <div key={group}>
                      <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5 mt-2 text-muted-foreground/60">{group}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {chs.map((c) => {
                          const active = method === c.code;
                          return (
                            <button
                              key={c.code}
                              onClick={() => setMethod(c.code)}
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all text-left border ${
                                active ? "border-primary/40 bg-primary/5" : "border-border bg-background hover:bg-muted/50"
                              }`}
                            >
                              <div className="h-6 w-6 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 bg-muted border border-border">
                                <img src={c.icon_url} alt={c.name} className="h-5 w-5 object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              </div>
                              <span className={`text-xs font-medium leading-tight truncate ${active ? "text-primary" : "text-foreground"}`}>
                                {c.name.replace(" Virtual Account", " VA")}
                              </span>
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
        )}

        {/* Step 3 - Konfirmasi */}
        {step === 3 && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
            {selectedPackage && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Paket</span>
                <span className="text-sm font-bold text-foreground">{selectedPackage.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Bayar</span>
              <span className="text-sm font-bold text-foreground">{formatRp(resolvedAmount!)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Kredit didapat</span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">+{resolvedCredits!.toLocaleString("id-ID")}</span>
            </div>
            {resolvedCredits !== resolvedAmount && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Bonus kredit</span>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  +{(resolvedCredits! - resolvedAmount!).toLocaleString("id-ID")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Metode</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {selectedMethodLabel}
              </span>
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total bayar</span>
              <span className="text-lg font-extrabold text-foreground">{formatRp(resolvedAmount!)}</span>
            </div>
          </div>
        )}
      </div>

      {/* -- CTA footer -- */}
      <div className="px-5 pb-5 space-y-2.5">
        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={() => {
            if (step === 1 && canAdvanceStep1) setStep(2);
            else if (step === 2) setStep(3);
            else handlePay();
          }}
          disabled={(step === 1 && !canAdvanceStep1) || (step === 3 && (loading || !resolvedAmount || !!amountError))}
          className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            (step < 3 ? (step === 1 ? canAdvanceStep1 : true) : (resolvedAmount && !amountError))
              ? "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {step === 1 && (canAdvanceStep1 ? `Lanjut · ${formatRp(resolvedAmount!)}` : "Pilih nominal dulu")}
          {step === 2 && "Lanjut →"}
          {step === 3 && (loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : `Bayar Sekarang · ${formatRp(resolvedAmount!)}`)}
        </button>

        {step === 3 && (
          <p className="text-[10px] text-center text-muted-foreground/60">
            Kredit masuk otomatis setelah pembayaran dikonfirmasi
          </p>
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
  const maxAutoRetries = 6; // 30 detik auto-poll, lalu tunggu user klik manual

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await csrfFetch(`/api/billing/orders/${orderId}/sync`, {
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
      const res = await csrfFetch(`/api/billing/orders/${orderId}/sync`, {
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
            {timedOut ? "Pembayaran belum terkonfirmasi otomatis" : "Menunggu konfirmasi pembayaran..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {timedOut
              ? "Kalau sudah bayar, klik \"Cek Sekarang\" untuk memperbarui status secara manual."
              : `Server sedang mengecek status ke Tripay${retries > 0 ? ` (cek ke-${retries})` : ""}...`}
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
          ? <><Loader2 className="h-3 w-3 animate-spin" /> Mengecek...</>
          : <><RefreshCw className="h-3 w-3" /> Cek Sekarang</>}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pollDone, setPollDone] = useState(false);

  // Detect return from Tripay via xorderId=??x URL param
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

  const userPlanIndex = PLAN_CARDS.findIndex((p) => p.id === (user?.plan ?? "hobby"));
  const [cardIndex, setCardIndex] = useState(userPlanIndex === -1 ? 0 : userPlanIndex);
  const currentCard = PLAN_CARDS[cardIndex];
  const isCurrentPlan = currentCard.id === (user?.plan ?? "hobby");
  const isUnlocked = cardIndex <= (userPlanIndex === -1 ? 0 : userPlanIndex);

  // Peek carousel sizing
  const carouselRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const GAP = 16;
  const CARD_RATIO = 0.70;
  const cardWidth = containerWidth * CARD_RATIO;
  const sideOffset = (containerWidth - cardWidth) / 2;
  const trackX = sideOffset - cardIndex * (cardWidth + GAP);

  return (
    <div className="space-y-4">
      {/* Payment status banner */}
      {pendingOrderId && !pollDone && (
        <PaymentStatusBanner
          orderId={pendingOrderId}
          onDone={() => setPollDone(true)}
        />
      )}

      {/* -- Card Carousel (peek style) -- */}
      <div className="flex flex-col items-center gap-3">

        {/* Peek track */}
        <div ref={carouselRef} className="relative w-full overflow-hidden" style={{ maxWidth: "32rem", margin: "0 auto" }}>
          {/* Sliding track */}
          <div
            className="flex"
            style={{
              gap: GAP,
              transform: `translateX(${trackX}px)`,
              transition: "transform 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            {PLAN_CARDS.map((card, i) => {
              const isActive = i === cardIndex;
              const isUnlockedCard = i <= (userPlanIndex === -1 ? 0 : userPlanIndex);
              return (
                <div
                  key={card.id}
                  onClick={() => !isActive && setCardIndex(i)}
                  style={{
                    width: cardWidth,
                    flexShrink: 0,
                    opacity: isActive ? 1 : 0.65,
                    transform: isActive ? "scale(1)" : "scale(0.96)",
                    transformOrigin: i < cardIndex ? "right center" : "left center",
                    transition: "opacity 0.38s, transform 0.38s",
                    cursor: isActive ? "default" : "pointer",
                  }}
                >
                  <PlanCard
                    cfg={card}
                    isCurrentPlan={card.id === (user?.plan ?? "hobby")}
                    isUnlocked={isUnlockedCard}
                    credits={credits}
                    userName={user?.name}
                  />
                </div>
              );
            })}
          </div>

          {/* Edge fade - left */}
          <div
            className="absolute inset-y-0 left-0 pointer-events-none"
            style={{ width: "11%", background: "linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)" }}
          />
          {/* Edge fade - right */}
          <div
            className="absolute inset-y-0 right-0 pointer-events-none"
            style={{ width: "11%", background: "linear-gradient(to left, hsl(var(--background)) 0%, transparent 100%)" }}
          />
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

        {/* Plan status label */}
        <p className="text-xs font-medium" style={{ color: isCurrentPlan ? currentCard.accent : isUnlocked ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)" }}>
          {isCurrentPlan ? `Plan aktif kamu · ${currentCard.name}` : isUnlocked ? `${currentCard.name} · termasuk di plan kamu` : `${currentCard.name} · belum diaktifkan`}
        </p>

        {/* Riwayat / Upgrade quick actions */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <Link href="/billing/riwayat">
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted transition-all active:scale-[0.97] text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              Riwayat
            </button>
          </Link>
          {plan.name !== "Team" && (
            <Link href="/harga">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted transition-all active:scale-[0.97] text-muted-foreground">
                <Zap className="h-3 w-3" />
                Upgrade
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* -- Topup Section (always visible below carousel) -- */}
      <TopupSection />

      {/* -- Plan benefits -- */}
      <div key={cardIndex} className="rounded-xl border border-border bg-card px-4 py-3.5" style={{ animation: "fadeSlideIn 0.22s ease" }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-3 text-muted-foreground/60">
          Fitur {currentCard.name}
        </p>
        <div className="space-y-2">
          {PLAN_PERKS[currentCard.id].map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className={`h-1 w-1 rounded-full flex-shrink-0 ${isUnlocked ? "bg-muted-foreground/40" : "bg-muted-foreground/15"}`} />
              <span className={`text-sm ${isUnlocked ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                {perk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
