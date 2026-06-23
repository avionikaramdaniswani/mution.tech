import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";

const plans = [
  {
    key: "hobby",
    name: "Hobby",
    price: null,
    priceLabel: "Gratis",
    priceSub: "Selamanya",
    credits: 5000,
    creditsLabel: "5.000 kredit",
    creditsSub: "sekali saat daftar",
    highlight: false,
    cta: "Mulai Gratis",
    ctaHref: "/register",
    features: [
      "1 proyek aktif",
      "Deploy manual",
      "Log real-time",
      "SSL otomatis",
      "Proyek berhenti saat kredit habis",
      "Topup mulai Rp 1.000",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 26000,
    priceLabel: "Rp 26.000",
    priceSub: "per bulan",
    credits: 25000,
    creditsLabel: "25.000 kredit",
    creditsSub: "per siklus, rollover saat upgrade",
    highlight: true,
    cta: "Mulai Pro",
    ctaHref: "/register",
    features: [
      "Proyek tidak terbatas",
      "Deploy otomatis via GitHub",
      "Log real-time & monitoring",
      "SSL otomatis di semua domain",
      "Rollback 1 klik",
      "Managed PostgreSQL per proyek",
      "Bandwidth tidak dibatasi",
      "Topup mulai Rp 1.000",
    ],
  },
  {
    key: "team",
    name: "Team",
    price: 75000,
    priceLabel: "Rp 75.000",
    priceSub: "per bulan",
    credits: 60000,
    creditsLabel: "60.000 kredit",
    creditsSub: "per siklus, rollover saat upgrade",
    highlight: false,
    cta: "Mulai Team",
    ctaHref: "/register",
    features: [
      "Semua fitur Pro",
      "Kolaborasi tim (coming soon)",
      "Priority support",
      "Proyek tidak terbatas",
      "Deploy otomatis via GitHub",
      "SSL otomatis di semua domain",
      "Rollback 1 klik",
      "Topup mulai Rp 1.000",
    ],
  },
];

const faqs = [
  {
    q: "Apa itu kredit?",
    a: "Kredit adalah satuan tagihan di Mution. 1 kredit = Rp 1. Kredit dikurangi per menit selama container kamu aktif berjalan.",
  },
  {
    q: "Apa yang terjadi kalau kredit habis?",
    a: "Proyek kamu akan otomatis dihentikan sampai kamu topup kredit lagi. Data tidak hilang.",
  },
  {
    q: "Apakah kredit bisa rollover?",
    a: "Kredit rollover hanya berlaku saat upgrade plan (misal dari Pro ke Team). Kredit tidak rollover ke bulan berikutnya dalam plan yang sama.",
  },
  {
    q: "Berapa minimal topup?",
    a: "Minimal topup adalah Rp 1.000 (= 1.000 kredit). Topup langsung masuk ke saldo tanpa masa expired.",
  },
];

export default function HargaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <section className="px-3 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="mx-auto max-w-6xl space-y-4">

          {/* ── Plans card ── */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(249,115,22,0.07) 0%, transparent 55%)" }}
            />

            {/* Header */}
            <div
              className="relative z-10 px-8 sm:px-12 pt-12 pb-10"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
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
                Sistem berbasis kredit — kredit berkurang hanya saat kontainer aktif.
                Tidak ada biaya minimum, tidak ada kontrak.
              </p>
            </div>

            {/* Column headers */}
            <div
              className="relative z-10 grid"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.015)",
              }}
            >
              {plans.map((plan, i) => (
                <div
                  key={plan.key}
                  className="px-6 sm:px-10 py-6"
                  style={{
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    position: "relative",
                    background: plan.highlight ? "rgba(249,115,22,0.04)" : "transparent",
                  }}
                >
                  {plan.highlight && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0,
                        height: "2px",
                        background: "rgb(249,115,22)",
                      }}
                    />
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-sm font-bold"
                      style={{ color: plan.highlight ? "#fff" : "rgba(255,255,255,0.7)" }}
                    >
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
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
                  <div
                    className="text-2xl font-extrabold tabular-nums"
                    style={{ color: plan.highlight ? "rgb(249,115,22)" : "#fff" }}
                  >
                    {plan.priceLabel}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {plan.priceSub}
                  </div>
                </div>
              ))}
            </div>

            {/* Credits row */}
            <div
              className="relative z-10 grid"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {plans.map((plan, i) => (
                <div
                  key={plan.key}
                  className="px-6 sm:px-10 py-5"
                  style={{
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    background: plan.highlight ? "rgba(249,115,22,0.03)" : "transparent",
                  }}
                >
                  <div
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    Kredit
                  </div>
                  <div className="text-base font-bold" style={{ color: plan.highlight ? "rgb(249,115,22)" : "rgba(255,255,255,0.8)" }}>
                    {plan.creditsLabel}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {plan.creditsSub}
                  </div>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {(() => {
              const maxLen = Math.max(...plans.map((p) => p.features.length));
              return Array.from({ length: maxLen }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="relative z-10 grid"
                  style={{
                    gridTemplateColumns: "repeat(3, 1fr)",
                    borderBottom: rowIdx < maxLen - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  {plans.map((plan, colIdx) => {
                    const feat = plan.features[rowIdx];
                    return (
                      <div
                        key={plan.key}
                        className="px-6 sm:px-10 py-3.5 flex items-center gap-2.5"
                        style={{
                          borderRight: colIdx < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          background: plan.highlight ? "rgba(249,115,22,0.02)" : "transparent",
                        }}
                      >
                        {feat ? (
                          <>
                            <div
                              className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                              style={{ background: plan.highlight ? "rgb(249,115,22)" : "rgba(255,255,255,0.25)" }}
                            />
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                              {feat}
                            </span>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}

            {/* CTA row */}
            <div
              className="relative z-10 grid"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              {plans.map((plan, i) => (
                <div
                  key={plan.key}
                  className="px-6 sm:px-10 py-6"
                  style={{
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    background: plan.highlight ? "rgba(249,115,22,0.03)" : "transparent",
                  }}
                >
                  <Link href={plan.ctaHref}>
                    <button
                      className="w-full text-sm font-semibold rounded-xl px-4 py-2.5 transition-all"
                      style={
                        plan.highlight
                          ? {
                              background: "rgb(249,115,22)",
                              color: "#fff",
                              boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 16px rgba(249,115,22,0.25)",
                            }
                          : {
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.7)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }
                      }
                    >
                      {plan.cta}
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* ── FAQ card ── */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="px-8 sm:px-12 py-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em" }}
              >
                Pertanyaan umum
              </p>
            </div>
            <div className="grid sm:grid-cols-2">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="px-8 sm:px-12 py-6"
                  style={{
                    borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    borderBottom: i < faqs.length - 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <p className="text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {faq.q}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-2 text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            Ada pertanyaan? Hubungi kami di{" "}
            <a
              href="mailto:support@mution.tech"
              className="underline underline-offset-2"
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
