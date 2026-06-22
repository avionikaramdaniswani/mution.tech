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

      <section className="px-3 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="mx-auto max-w-6xl">

          {/* Main card — same style as hero card */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Subtle bg tint */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(249,115,22,0.07) 0%, transparent 55%)" }}
            />

            {/* ── Header area ── */}
            <div
              className="relative z-10 px-8 sm:px-12 pt-12 pb-10"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-4"
                    style={{ color: "rgba(249,115,22,0.85)" }}
                  >
                    Harga
                  </p>
                  <h1
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] mb-4"
                  >
                    Bayar yang dipakai.<br />
                    <span style={{ color: "rgba(255,255,255,0.28)" }}>Bukan yang di-idle.</span>
                  </h1>
                  <p className="text-sm leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Tagihan per menit selama container aktif. Aplikasi mati, tagihan berhenti.
                    Tidak ada biaya minimum, tidak ada kontrak.
                  </p>
                </div>
                <Link href="/register">
                  <button
                    className="flex-shrink-0 text-sm font-semibold rounded-xl px-6 py-3 transition-all whitespace-nowrap"
                    style={{
                      background: "rgb(249,115,22)",
                      color: "#fff",
                      boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 20px rgba(249,115,22,0.28)",
                    }}
                  >
                    Mulai Gratis
                  </button>
                </Link>
              </div>
            </div>

            {/* ── Column headers ── */}
            <div
              className="relative z-10 grid"
              style={{
                gridTemplateColumns: "1fr 1fr 1fr",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.015)",
              }}
            >
              {[
                { label: "RAM", align: "left" },
                { label: "Per Menit", align: "center" },
                { label: "Est. 30 Hari", align: "right" },
              ].map((col, i) => (
                <div
                  key={col.label}
                  className="px-8 sm:px-12 py-3.5"
                  style={{
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    textAlign: col.align as React.CSSProperties["textAlign"],
                  }}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    {col.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Price rows ── */}
            <div className="relative z-10">
              {ramPlans.map((plan, i) => (
                <div
                  key={plan.ram}
                  className="grid transition-colors"
                  style={{
                    gridTemplateColumns: "1fr 1fr 1fr",
                    borderBottom: i < ramPlans.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    background: plan.popular ? "rgba(249,115,22,0.055)" : "transparent",
                    position: "relative",
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0, top: 0, bottom: 0,
                        width: "3px",
                        background: "rgb(249,115,22)",
                      }}
                    />
                  )}

                  {/* RAM */}
                  <div
                    className="px-8 sm:px-12 py-5 flex items-center gap-3"
                    style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span
                      className="font-semibold text-sm"
                      style={{ color: plan.popular ? "#fff" : "rgba(255,255,255,0.65)" }}
                    >
                      {plan.ram}
                    </span>
                    {plan.popular && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full hidden sm:inline-block"
                        style={{
                          background: "rgba(249,115,22,0.15)",
                          color: "rgb(249,115,22)",
                          border: "1px solid rgba(249,115,22,0.22)",
                        }}
                      >
                        Populer
                      </span>
                    )}
                  </div>

                  {/* Per menit */}
                  <div
                    className="px-8 sm:px-12 py-5 flex items-center justify-center"
                    style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span
                      className="font-mono font-bold text-base tabular-nums"
                      style={{ color: plan.popular ? "rgb(249,115,22)" : "rgba(255,255,255,0.8)" }}
                    >
                      {plan.perMenit}
                    </span>
                  </div>

                  {/* Est. 30 hari */}
                  <div className="px-8 sm:px-12 py-5 flex items-center justify-end">
                    <span
                      className="font-mono text-sm tabular-nums"
                      style={{ color: "rgba(255,255,255,0.28)" }}
                    >
                      {plan.perBulan}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer note ── */}
            <div
              className="relative z-10 px-8 sm:px-12 py-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
            >
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>
                * Estimasi 30 hari dihitung nonstop (43.200 menit). Tagihan aktual biasanya lebih rendah.
              </p>
            </div>

            {/* ── Included section — grid like "Dipercaya" ── */}
            <div
              className="relative z-10"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="px-8 sm:px-12 py-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em" }}
                >
                  Sudah termasuk di semua plan
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {included.map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 px-8 sm:px-12 py-5"
                    style={{
                      borderRight: (i % 3 < 2 && i < included.length - 1) ? "1px solid rgba(255,255,255,0.05)" : "none",
                      borderBottom: i < included.length - 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ background: "rgb(249,115,22)" }}
                    />
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <p className="mt-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            Ada pertanyaan? Hubungi kami di{" "}
            <a
              href="mailto:support@mution.tech"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              support@mution.tech
            </a>
          </p>

        </div>
      </section>
    </div>
  );
}
