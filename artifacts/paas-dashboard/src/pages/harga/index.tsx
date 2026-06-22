import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";

const ramPlans = [
  { ram: "256 MB",  perMenit: "Rp0,29",  perBulan: "Rp12.700" },
  { ram: "512 MB",  perMenit: "Rp0,59",  perBulan: "Rp25.400", popular: true },
  { ram: "768 MB",  perMenit: "Rp0,88",  perBulan: "Rp38.100" },
  { ram: "1 GB",    perMenit: "Rp1,18",  perBulan: "Rp50.800" },
  { ram: "2 GB",    perMenit: "Rp2,36",  perBulan: "Rp101.700" },
  { ram: "4 GB",    perMenit: "Rp4,71",  perBulan: "Rp203.500" },
  { ram: "8 GB",    perMenit: "Rp9,42",  perBulan: "Rp407.000" },
];

const included = [
  "Deploy unlimited proyek",
  "SSL otomatis di semua domain",
  "Managed PostgreSQL per proyek",
  "Log real-time & monitoring",
  "Rollback 1 klik",
  "Bandwidth tidak dibatasi",
];

export default function HargaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-20 pb-32">

        {/* Header */}
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(249,115,22,0.8)" }}>
            Harga
          </p>
          <h1
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] mb-5"
          >
            Bayar yang dipakai.<br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Bukan yang di-idle.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.45)" }}>
            Tagihan berjalan per menit selama container aktif. Kalau aplikasi kamu mati, tagihan ikut berhenti. Tidak ada biaya minimum, tidak ada kontrak.
          </p>
        </div>

        {/* Pricing table */}
        <div className="mb-5" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
          {/* thead */}
          <div
            className="grid grid-cols-3 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-widest"
            style={{
              color: "rgba(255,255,255,0.22)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span>RAM</span>
            <span className="text-center">/ menit</span>
            <span className="text-right">est. 30 hari</span>
          </div>

          {ramPlans.map((plan, i) => (
            <div
              key={plan.ram}
              className="grid grid-cols-3 items-center px-6 py-4 transition-colors"
              style={{
                borderBottom: i < ramPlans.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: plan.popular ? "rgba(249,115,22,0.06)" : "transparent",
                position: "relative",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "3px",
                    background: "rgb(249,115,22)",
                    borderRadius: "0",
                  }}
                />
              )}

              {/* RAM label */}
              <div className="flex items-center gap-3 pl-1">
                <span
                  className="font-semibold text-sm"
                  style={{ color: plan.popular ? "#fff" : "rgba(255,255,255,0.7)" }}
                >
                  {plan.ram}
                </span>
                {plan.popular && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full hidden sm:inline-block"
                    style={{
                      background: "rgba(249,115,22,0.18)",
                      color: "rgb(249,115,22)",
                      border: "1px solid rgba(249,115,22,0.25)",
                    }}
                  >
                    Populer
                  </span>
                )}
              </div>

              {/* Per menit */}
              <div className="text-center">
                <span
                  className="font-mono font-bold text-base tabular-nums"
                  style={{ color: plan.popular ? "rgb(249,115,22)" : "rgba(255,255,255,0.85)" }}
                >
                  {plan.perMenit}
                </span>
              </div>

              {/* Estimasi */}
              <div
                className="text-right font-mono text-sm tabular-nums"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {plan.perBulan}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] mb-16" style={{ color: "rgba(255,255,255,0.2)" }}>
          * Estimasi 30 hari dihitung nonstop (43.200 menit). Tagihan aktual biasanya lebih rendah.
        </p>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: "56px" }} />

        {/* What's included */}
        <div className="mb-16">
          <h2
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "rgba(255,255,255,0.85)" }}
            className="text-xl font-bold mb-7"
          >
            Sudah termasuk di semua plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            {included.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div
                  className="mt-[3px] flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgb(249,115,22)" }} />
                </div>
                <span className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA strip */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-7 py-6 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white mb-1">Mulai gratis, tanpa kartu kredit</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Coba platform sekarang, upgrade kapan pun kamu mau.
            </p>
          </div>
          <Link href="/register">
            <button
              className="flex-shrink-0 text-sm font-semibold rounded-xl px-5 py-2.5 transition-all"
              style={{
                background: "rgb(249,115,22)",
                color: "#fff",
                boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 20px rgba(249,115,22,0.3)",
              }}
            >
              Daftar Sekarang
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
