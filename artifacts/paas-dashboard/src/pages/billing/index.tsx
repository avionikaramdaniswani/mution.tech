import { CreditCard, Zap, Clock } from "lucide-react";

const usageItems = [
  { label: "Container aktif",   value: "3 proyek" },
  { label: "Total RAM dipakai", value: "1,5 GB"   },
  { label: "Periode tagihan",   value: "Juni 2026" },
];

export default function BillingPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Tagihan dan penggunaan resource kamu.</p>
      </div>

      {/* Current plan */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <Zap className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Plan Aktif</p>
        </div>

        <div className="px-6 py-6 flex items-center justify-between gap-6">
          <div>
            <p className="text-xl font-bold">Pay-as-you-go</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ditagih per menit selama container berjalan. Tidak ada biaya minimum.
            </p>
          </div>
          <span
            className="flex-shrink-0 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full"
            style={{ background: "rgba(249,115,22,0.12)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.22)" }}
          >
            Aktif
          </span>
        </div>
      </div>

      {/* Usage this month */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Penggunaan Bulan Ini</p>
        </div>

        <div>
          {usageItems.map((item, i) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: i < usageItems.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div
        className="rounded-2xl px-6 py-8 flex flex-col items-center text-center gap-3"
        style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
      >
        <CreditCard className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Riwayat invoice & metode pembayaran</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Segera hadir — kami sedang menyiapkan integrasi pembayaran.</p>
        </div>
      </div>
    </div>
  );
}
