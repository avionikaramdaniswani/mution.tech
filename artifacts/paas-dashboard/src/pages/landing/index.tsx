import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Box,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

const runtimes = ["Node.js", "Python", "PHP", "Static"];

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    desc: "Untuk proyek pribadi dan eksperimen.",
    features: ["3 proyek", "1 GB RAM per container", "CPU Bersama", "Dukungan komunitas"],
    cta: "Mulai sekarang",
    highlight: false,
  },
  {
    name: "Pro",
    price: "Rp 189rb",
    per: "/bln",
    desc: "Untuk tim yang men-deploy aplikasi produksi.",
    features: ["Proyek tak terbatas", "4 GB RAM per container", "CPU Dedicated", "Dukungan prioritas", "Domain kustom", "Database terkelola"],
    cta: "Coba gratis 14 hari",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Kustom",
    desc: "Untuk organisasi yang butuh kendali penuh.",
    features: ["Semua fitur Pro", "Jaminan SLA", "Opsi on-premise", "Account manager khusus", "Audit log", "SSO / SAML"],
    cta: "Hubungi kami",
    highlight: false,
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 30 detik", label: "Rata-rata deploy" },
  { value: "10.000+", label: "Proyek aktif" },
  { value: "24/7", label: "Dukungan teknis" },
];

export default function Landing() {
  const { user } = useAuth();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("dark");

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground dark">

      {/* ── Fixed scroll track: line + comet ── */}
      <div
        className="fixed hidden lg:block pointer-events-none z-30"
        style={{ left: "28px", top: "64px", bottom: 0, width: "1px", background: "rgba(255,255,255,0.05)" }}
      >
        {/* Track fill behind comet */}
        <div
          style={{
            position: "absolute", left: 0, top: 0, width: "1px",
            height: `${scrollProgress * 100}%`,
            background: "linear-gradient(to bottom, transparent, rgba(249,115,22,0.15) 40%, rgba(249,115,22,0.5))",
          }}
        />

        {/* Comet — tail fades up, bright head at bottom */}
        <div
          style={{
            position: "absolute",
            left: "-3px",
            top: `${scrollProgress * 100}%`,
            transform: "translateY(-100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Tail */}
          <div style={{
            width: "1px",
            height: "60px",
            background: "linear-gradient(to bottom, transparent, rgba(249,115,22,0.25) 60%, rgba(249,115,22,0.7))",
          }} />
          {/* Head */}
          <div style={{
            width: "7px", height: "7px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #ffb86c, rgb(249,115,22) 60%)",
            boxShadow: "0 0 6px 2px rgba(249,115,22,0.6), 0 0 14px 4px rgba(249,115,22,0.25)",
            flexShrink: 0,
          }} />
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/mution-logo.png" alt="Mution" className="h-9 w-auto" />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-extrabold text-primary tracking-tight">Mution</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#harga" className="hover:text-foreground transition-colors">Harga</a>
              <a href="#runtime" className="hover:text-foreground transition-colors">Runtime</a>
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

      {/* ── Hero Card ── */}
      <section className="px-3 sm:px-6 lg:px-8 pt-6 pb-0">
        <div className="mx-auto max-w-6xl">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Background image */}
            <div className="absolute inset-0" style={{
              backgroundImage: "url('/hero-bg.png?v=2')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }} />
            {/* Dark overlay so text is readable */}
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to bottom, rgba(4,4,12,0.78) 0%, rgba(6,6,16,0.72) 50%, rgba(8,8,18,0.92) 100%)",
            }} />
            {/* Subtle orange glow at bottom center */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse at 50% 110%, rgba(249,115,22,0.2) 0%, transparent 55%)",
            }} />

            {/* Hero text content */}
            <div className="relative z-10 text-center px-6 pt-20 pb-14">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.06]">
                Deploy tanpa<br />
                <span className="text-primary">batas kompleksitas.</span>
              </h1>
              <p className="mt-6 text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style={{ color:"rgba(255,255,255,0.5)" }}>
                Platform infrastruktur modern — deploy, scale, dan pantau aplikasi kamu tanpa perlu mengurus server atau konfigurasi rumit.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/login">
                  <button
                    className="group inline-flex items-center gap-2 rounded-xl font-semibold text-sm transition-all duration-200"
                    style={{
                      background: "rgb(249,115,22)",
                      color: "#fff",
                      padding: "12px 28px",
                      boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 24px rgba(249,115,22,0.35)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 0 1px rgba(249,115,22,0.6), 0 6px 32px rgba(249,115,22,0.5)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0 1px rgba(249,115,22,0.4), 0 4px 24px rgba(249,115,22,0.35)")}
                  >
                    Deploy Sekarang
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                </Link>
              </div>
              <p className="mt-5 text-xs" style={{ color:"rgba(255,255,255,0.22)" }}>Tidak perlu kartu kredit · Tier gratis tersedia</p>
            </div>

            {/* Dashboard preview peek */}
            <div className="relative z-10 px-4 sm:px-10">
              <div className="mx-auto max-w-4xl rounded-t-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.1)", borderBottom:"none", background:"rgba(10,10,18,0.9)", boxShadow:"0 -20px 60px rgba(0,0,0,0.5)" }}>
                {/* Fake window chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor:"rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background:"rgba(255,255,255,0.12)" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background:"rgba(255,255,255,0.12)" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background:"rgba(255,255,255,0.12)" }} />
                  <div className="flex-1 mx-4 rounded px-3 py-1 text-[10px]" style={{ background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.2)" }}>app.mution.id/dashboard</div>
                </div>
                {/* Fake dashboard rows */}
                <div className="p-4 space-y-2">
                  {["my-api · Node.js · ● Running", "frontend · Static · ● Running", "auth-service · Python · ⟳ Building"].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-6 h-6 rounded" style={{ background:"rgba(249,115,22,0.15)", border:"1px solid rgba(249,115,22,0.25)" }} />
                      <span className="text-xs font-mono" style={{ color:"rgba(255,255,255,0.4)" }}>{row}</span>
                      <div className="ml-auto w-16 h-4 rounded" style={{ background:"rgba(255,255,255,0.04)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trusted By — inside the same card */}
            <div className="relative z-10 mt-0" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-6 py-4 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
                <p className="text-center text-xs font-medium" style={{ color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em", textTransform:"uppercase" }}>Dipercaya oleh tim dari berbagai industri</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                {["Tokopedia","Gojek","Traveloka","Ruangguru","Bukalapak","Kumparan"].map((name, i) => (
                  <div key={i} className="flex items-center justify-center py-5 px-4" style={{ borderRight: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className="text-sm font-semibold" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"system-ui", letterSpacing:"-0.02em" }}>{name}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6">
                {["Flip","Xendit","Midtrans","Ovo","Dana","Shopee"].map((name, i) => (
                  <div key={i} className="flex items-center justify-center py-5 px-4" style={{ borderRight: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className="text-sm font-semibold" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"system-ui", letterSpacing:"-0.02em" }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Runtimes */}
      <section id="runtime" className="border-y border-border/50 bg-card/20 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">Runtime yang Didukung</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {runtimes.map((r) => (
              <div key={r} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-5 py-2.5 text-sm font-medium text-foreground">
                <Box className="h-4 w-4 text-primary" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="border-t border-border/50 bg-card/20 py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Harga yang jelas, tanpa biaya tersembunyi</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">Mulai gratis, scale saat kamu siap.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">Paling Populer</div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.per && <span className="text-muted-foreground">{plan.per}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="mt-8 w-full" variant={plan.highlight ? "default" : "outline"}>{plan.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 px-8 py-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Siap deploy aplikasi pertamamu?</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Bergabung dengan ribuan developer yang sudah hosting di Mution. Siap dalam kurang dari 5 menit.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button size="lg" className="text-base px-10 gap-2 h-12 font-semibold">
                  Mulai Gratis Sekarang <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground/70">Tidak perlu kartu kredit</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand + founders */}
            <div className="flex flex-col items-center sm:items-start gap-2">
              <div className="flex items-center gap-2.5">
                <img src="/mution-logo.png" alt="Mution" className="h-6 w-auto" />
                <span style={{ fontFamily:"'Space Grotesk', sans-serif" }} className="text-sm font-extrabold text-primary">Mution</span>
              </div>
              <p className="text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>
                Pioo (Co-founder & CEO) · Tiara (Co-founder)
              </p>
            </div>

            {/* Email */}
            <a
              href="mailto:support@mution.tech"
              className="text-xs transition-colors"
              style={{ color:"rgba(255,255,255,0.4)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgb(249,115,22)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              support@mution.tech
            </a>

            {/* Copyright + links */}
            <div className="flex flex-col items-center sm:items-end gap-1.5">
              <p className="text-xs" style={{ color:"rgba(255,255,255,0.2)" }}>
                © {new Date().getFullYear()} Mution. Dibuat di Indonesia.
              </p>
              <div className="flex gap-4 text-xs" style={{ color:"rgba(255,255,255,0.25)" }}>
                {["Privasi","Ketentuan","Status"].map(l => (
                  <a key={l} href="#" className="transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >{l}</a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
