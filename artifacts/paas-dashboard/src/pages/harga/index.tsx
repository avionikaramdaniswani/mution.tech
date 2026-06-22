import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, HelpCircle, Zap, Database, Wifi } from "lucide-react";
import { useState } from "react";

const ramPlans = [
  { ram: "256 MB",  perMenit: "Rp0,29",  perBulan: "~Rp12.700",  popular: false },
  { ram: "512 MB",  perMenit: "Rp0,59",  perBulan: "~Rp25.400",  popular: true  },
  { ram: "768 MB",  perMenit: "Rp0,88",  perBulan: "~Rp38.100",  popular: false },
  { ram: "1 GB",    perMenit: "Rp1,18",  perBulan: "~Rp50.800",  popular: false },
  { ram: "2 GB",    perMenit: "Rp2,36",  perBulan: "~Rp101.700", popular: false },
  { ram: "4 GB",    perMenit: "Rp4,71",  perBulan: "~Rp203.500", popular: false },
  { ram: "8 GB",    perMenit: "Rp9,42",  perBulan: "~Rp407.000", popular: false },
];

const addOns = [
  {
    icon: Database,
    label: "Storage",
    rate: "Rp150",
    unit: "/ GB / bulan",
    desc: "Persistent disk. 1 GB pertama gratis per proyek.",
  },
  {
    icon: Wifi,
    label: "Bandwidth Keluar",
    rate: "Rp120",
    unit: "/ GB",
    desc: "Ingress (masuk) gratis tanpa batas.",
  },
];

const includes = [
  "Billing per menit — stop app = tagihan berhenti",
  "SSL otomatis untuk setiap deployment",
  "Custom domain (semua ukuran)",
  "Managed PostgreSQL per proyek",
  "1 GB storage gratis per proyek",
  "Rp100.000 kredit gratis saat daftar",
];

const faqs = [
  {
    q: "Apa bedanya 'per menit' dengan 'per bulan'?",
    a: "Kamu hanya bayar selama container kamu nyala. Kalau app dimatikan 2 minggu, kamu hanya ditagih 2 minggu. Estimasi 30 hari adalah kalkulasi kalau app berjalan nonstop — bukan biaya minimum.",
  },
  {
    q: "Apakah CPU ikut dihitung?",
    a: "Tidak terpisah. Tiap RAM tier sudah termasuk alokasi CPU proporsional. Billing kamu cukup lihat satu angka saja — berdasarkan RAM yang kamu pilih.",
  },
  {
    q: "Kapan tagihan diproses?",
    a: "Invoice otomatis dihasilkan di akhir setiap bulan. Kamu bisa pantau usage real-time dari dashboard tanpa kejutan di tagihan.",
  },
  {
    q: "Bagaimana kredit Rp100.000 bekerja?",
    a: "Kredit langsung dikreditkan saat kamu mendaftar dan dipakai otomatis sebelum metode pembayaran dikenakan. Tidak perlu kartu kredit untuk mulai.",
  },
  {
    q: "Apakah ada biaya tersembunyi?",
    a: "Tidak ada. Biaya setup Rp0, biaya idle Rp0, ingress Rp0. Kamu hanya bayar RAM per menit, storage, dan bandwidth keluar yang kamu gunakan.",
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground dark">

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2.5 cursor-pointer">
                <img src="/mution-logo.png" alt="Mution" className="h-9 w-auto" />
                <span
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="text-xl font-extrabold text-primary tracking-tight"
                >
                  Mution
                </span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/harga" className="text-foreground font-medium transition-colors">Harga</Link>
              <Link href="/#runtime" className="hover:text-foreground transition-colors">Runtime</Link>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm">Buka Dashboard <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </Link>
              ) : (
                <>
                  <Link href="/login"><Button variant="ghost" size="sm">Masuk</Button></Link>
                  <Link href="/register"><Button size="sm">Daftar Gratis</Button></Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-6">
            <Zap className="h-3.5 w-3.5" />
            Bayar apa yang kamu pakai
          </div>
          <h1
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4"
          >
            Harga yang <span className="text-primary">jujur</span><br />dan transparan
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Tidak ada tier, tidak ada kontrak. Pilih ukuran RAM yang kamu butuhkan,
            bayar per menit selama app berjalan.
          </p>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border/60 overflow-hidden">

            {/* Table Header */}
            <div className="grid grid-cols-3 bg-muted/30 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <span>RAM</span>
              <span className="text-center">Per Menit</span>
              <span className="text-right">Estimasi 30 Hari Nonstop</span>
            </div>

            {/* Rows */}
            {ramPlans.map((plan, i) => (
              <div
                key={plan.ram}
                className={`grid grid-cols-3 items-center px-6 py-4 border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20 ${
                  plan.popular ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{plan.ram}</span>
                  {plan.popular && (
                    <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">
                      Populer
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold font-mono ${plan.popular ? "text-primary" : "text-foreground"}`}>
                    {plan.perMenit}
                  </span>
                </div>
                <div className="text-right text-muted-foreground text-sm tabular-nums">
                  {plan.perBulan}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Estimasi 30 hari = rate × 43.200 menit. Tagihan aktual biasanya lebih rendah karena dihitung dari pemakaian nyata.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mx-auto max-w-3xl">
          <h2
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="text-xl font-bold mb-6 text-center"
          >
            Sudah termasuk di semua ukuran
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {includes.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mx-auto max-w-3xl">
          <h2
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="text-xl font-bold mb-6 text-center"
          >
            Biaya tambahan
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {addOns.map(({ icon: Icon, label, rate, unit, desc }) => (
              <div
                key={label}
                className="rounded-2xl border border-border/60 bg-muted/10 px-6 py-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <span className="text-2xl font-bold font-mono text-foreground">{rate}</span>
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mx-auto max-w-2xl">
          <h2
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="text-xl font-bold mb-6 text-center"
          >
            Pertanyaan umum
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  <HelpCircle
                    className={`h-4 w-4 flex-shrink-0 transition-colors ${
                      openFaq === i ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="rounded-2xl border border-primary/20 bg-primary/5 px-8 py-12"
            style={{ boxShadow: "0 0 60px -20px rgba(249,115,22,0.15)" }}
          >
            <h2
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              className="text-2xl font-extrabold mb-3"
            >
              Mulai dengan Rp100.000 kredit gratis
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tidak perlu kartu kredit. Deploy proyek pertamamu dalam 60 detik.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Buka Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto">
                      Daftar Gratis <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Sudah punya akun? Masuk
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/mution-logo.png" alt="Mution" className="h-6 w-auto opacity-60" />
            <span className="text-sm text-muted-foreground">© 2025 Mution. All rights reserved.</span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Beranda</Link>
            <Link href="/harga" className="hover:text-foreground transition-colors">Harga</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
