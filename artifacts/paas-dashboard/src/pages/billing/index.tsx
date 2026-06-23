import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListTransactions, useTopupCredits } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Wallet, Zap, ArrowUpCircle, Clock, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function creditColor(credits: number) {
  if (credits === 0) return "rgb(239,68,68)";
  if (credits <= 1000) return "rgb(234,179,8)";
  return "rgb(34,197,94)";
}

function TopupModal({ onClose, currentCredits }: { onClose: () => void; currentCredits: number }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const topup = useTopupCredits();

  const presets = [5000, 10000, 25000, 50000, 100000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseInt(amount.replace(/\D/g, ""), 10);
    if (!parsed || parsed < 1000) {
      setError("Minimal topup adalah Rp 1.000");
      return;
    }
    topup.mutate(
      { data: { amount: parsed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/transactions"] });
          onClose();
        },
        onError: () => {
          setError("Topup gagal, coba lagi.");
        },
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "hsl(var(--background))", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="h-5 w-5" style={{ color: "rgb(249,115,22)" }} />
            <p className="font-semibold">Topup Kredit</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Preset amounts */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Pilih nominal</p>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setAmount(String(p)); setError(""); }}
                  className="text-xs font-semibold py-2.5 rounded-xl transition-all"
                  style={
                    amount === String(p)
                      ? { background: "rgba(249,115,22,0.15)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.35)" }
                      : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {formatRp(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Atau masukkan nominal lain</p>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Rp
              </span>
              <Input
                type="number"
                min={1000}
                step={1000}
                placeholder="1.000"
                className="pl-9 tabular-nums"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
              />
            </div>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
              Minimal Rp 1.000 · 1 kredit = Rp 1
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Preview */}
          {amount && parseInt(amount) >= 1000 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}
            >
              <span className="text-xs text-muted-foreground">Saldo setelah topup</span>
              <span className="text-sm font-bold" style={{ color: "rgb(34,197,94)" }}>
                {formatRp(currentCredits + parseInt(amount))}
              </span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={topup.isPending}
            style={{ background: "rgb(249,115,22)", color: "#fff" }}
          >
            {topup.isPending ? "Memproses…" : `Topup ${amount && parseInt(amount) >= 1000 ? formatRp(parseInt(amount)) : ""}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

function planStyle(plan?: string) {
  if (plan === "team") return { name: "Team", color: "rgba(139,92,246,0.8)" };
  if (plan === "pro")  return { name: "Pro",  color: "rgb(249,115,22)" };
  return { name: "Hobby", color: "rgba(255,255,255,0.4)" };
}

export default function BillingPage() {
  const { user } = useAuth();
  const [showTopup, setShowTopup] = useState(false);

  const { data: transactions, isLoading: txLoading } = useListTransactions();

  const credits = user?.credits ?? 0;
  const plan = planStyle(user?.plan);
  const pct = Math.min(100, Math.round((credits / 5000) * 100));

  return (
    <>
      {showTopup && (
        <TopupModal onClose={() => setShowTopup(false)} currentCredits={credits} />
      )}

      <div className="space-y-4">

        {/* ── Saldo & Plan (merged) ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
          >
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Saldo & Plan</p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Top row: balance + buttons */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              {/* Balance info */}
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

              {/* Action buttons */}
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
                <Button
                  onClick={() => setShowTopup(true)}
                  className="flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 h-auto"
                  style={{
                    background: "rgb(249,115,22)",
                    color: "#fff",
                    boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 16px rgba(249,115,22,0.2)",
                  }}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Topup
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: creditColor(credits) }}
              />
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* Plan row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Plan aktif</p>
                <span
                  className="text-sm font-bold"
                  style={{ color: plan.color }}
                >
                  {plan.name}
                </span>
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
    </>
  );
}
