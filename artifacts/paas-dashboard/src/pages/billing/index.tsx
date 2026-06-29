import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListTransactions } from "@workspace/api-client-react";
import { Wallet, Zap, ArrowUpCircle, Clock, TrendingUp, ShoppingCart, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const PACKAGES = [
  { id: "starter",    label: "Starter",    idr: 50_000,  credits: 50_000,  bonus: 0,  color: "rgba(255,255,255,0.15)" },
  { id: "basic",      label: "Basic",      idr: 100_000, credits: 110_000, bonus: 10, color: "rgba(249,115,22,0.25)"  },
  { id: "pro",        label: "Pro",        idr: 250_000, credits: 300_000, bonus: 20, color: "rgba(139,92,246,0.3)"  },
  { id: "enterprise", label: "Enterprise", idr: 500_000, credits: 650_000, bonus: 30, color: "rgba(34,197,94,0.25)"  },
] as const;

const PAYMENT_METHODS = [
  { id: "QRIS",      label: "QRIS" },
  { id: "BRIVA",     label: "BRI Virtual Account" },
  { id: "BNIVA",     label: "BNI Virtual Account" },
  { id: "MANDIRIVA", label: "Mandiri Virtual Account" },
  { id: "BCAVA",     label: "BCA Virtual Account" },
  { id: "BSIVA",     label: "BSI Virtual Account" },
];

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function creditColor(credits: number) {
  if (credits === 0) return "rgb(239,68,68)";
  if (credits <= 1000) return "rgb(234,179,8)";
  return "rgb(34,197,94)";
}

function planStyle(plan?: string) {
  if (plan === "team") return { name: "Team", color: "rgba(139,92,246,0.8)" };
  if (plan === "pro")  return { name: "Pro",  color: "rgb(249,115,22)" };
  return { name: "Hobby", color: "rgba(255,255,255,0.4)" };
}

export default function BillingPage() {
  const { user } = useAuth();
  const { data: transactions, isLoading: txLoading } = useListTransactions();

  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("QRIS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credits = user?.credits ?? 0;
  const plan = planStyle(user?.plan);
  const pct = Math.min(100, Math.round((credits / 5000) * 100));

  async function handleTopup() {
    if (!selectedPkg) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/tripay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: selectedPkg, method: selectedMethod }),
      });
      const data = await res.json() as { paymentUrl?: string; error?: string };
      if (!res.ok || !data.paymentUrl) {
        setError(data.error ?? "Gagal membuat transaksi");
        return;
      }
      window.open(data.paymentUrl, "_blank");
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Saldo & Plan ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Saldo & Plan</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p
                className="text-4xl font-extrabold tabular-nums tracking-tight"
                style={{ color: creditColor(credits) }}
              >
                {formatRp(credits)}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {credits === 0
                  ? "Kredit habis — proyek kamu dihentikan."
                  : credits <= 1000
                  ? "Kredit hampir habis — segera topup."
                  : "Kredit tersedia"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
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
          </div>

          <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: creditColor(credits) }}
            />
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Plan aktif</p>
              <span className="text-sm font-bold" style={{ color: plan.color }}>{plan.name}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Aktif
              </span>
            </div>
            <Link href="/harga">
              <button
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}
              >
                Lihat semua plan →
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Topup Kredit ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Topup Kredit</p>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ml-auto"
            style={{ background: "rgba(249,115,22,0.12)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            via Tripay
          </span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Package grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PACKAGES.map((pkg) => {
              const selected = selectedPkg === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  className="relative rounded-xl p-4 text-left transition-all"
                  style={{
                    border: selected
                      ? "1px solid rgba(249,115,22,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: selected ? "rgba(249,115,22,0.08)" : pkg.color,
                  }}
                >
                  {pkg.bonus > 0 && (
                    <span
                      className="absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.15)", color: "rgb(34,197,94)", border: "1px solid rgba(34,197,94,0.2)" }}
                    >
                      +{pkg.bonus}%
                    </span>
                  )}
                  {selected && (
                    <CheckCircle className="absolute top-2 right-2 h-3.5 w-3.5" style={{ color: "rgb(249,115,22)" }} />
                  )}
                  <p className="text-xs text-muted-foreground mb-1">{pkg.label}</p>
                  <p className="text-sm font-bold">{formatRp(pkg.idr)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {pkg.credits.toLocaleString("id-ID")} kredit
                  </p>
                </button>
              );
            })}
          </div>

          {/* Payment method */}
          {selectedPkg && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className="rounded-lg px-3 py-2 text-left text-xs font-medium transition-all"
                    style={{
                      border: selectedMethod === m.id
                        ? "1px solid rgba(249,115,22,0.6)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: selectedMethod === m.id ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
                      color: selectedMethod === m.id ? "rgb(249,115,22)" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          <Button
            onClick={handleTopup}
            disabled={!selectedPkg || loading}
            className="w-full h-10 text-sm font-semibold rounded-xl"
            style={{
              background: selectedPkg ? "rgb(249,115,22)" : "rgba(255,255,255,0.06)",
              color: selectedPkg ? "white" : "rgba(255,255,255,0.3)",
              border: "none",
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses…
              </span>
            ) : selectedPkg ? (
              <span className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Bayar {formatRp(PACKAGES.find(p => p.id === selectedPkg)?.idr ?? 0)} via Tripay
              </span>
            ) : (
              "Pilih paket terlebih dahulu"
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            Kredit otomatis masuk setelah pembayaran dikonfirmasi · Diproses via Tripay
          </p>
        </div>
      </div>

      {/* ── Riwayat Transaksi ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
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
