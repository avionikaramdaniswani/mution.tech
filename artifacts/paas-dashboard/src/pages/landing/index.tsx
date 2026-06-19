import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Shield,
  GitBranch,
  Globe,
  ArrowRight,
  CheckCircle2,
  Box,
  Activity,
  Database,
  ChevronRight,
} from "lucide-react";
import { useEffect } from "react";

const features = [
  {
    icon: Zap,
    title: "Deploy dalam Hitungan Detik",
    desc: "Push kode kamu dan langsung live. Deploy tanpa downtime dengan rollback otomatis.",
  },
  {
    icon: Shield,
    title: "Aman sejak Awal",
    desc: "SSL, container terisolasi, dan enkripsi environment variable sudah tersedia secara default.",
  },
  {
    icon: GitBranch,
    title: "Alur Kerja Berbasis Git",
    desc: "Hubungkan repo kamu dan deploy setiap kali push. Log build lengkap tersedia.",
  },
  {
    icon: Globe,
    title: "Domain Kustom",
    desc: "Pasang domain sendiri ke proyek manapun. HTTPS otomatis diaktifkan.",
  },
  {
    icon: Database,
    title: "Database Terkelola",
    desc: "Provisioning database PostgreSQL per proyek hanya dengan satu klik.",
  },
  {
    icon: Activity,
    title: "Monitoring Real-time",
    desc: "Log deployment live, status, dan riwayat aktivitas untuk setiap proyek.",
  },
];

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

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/mution-logo.png" alt="Mution" className="h-9 w-auto" />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-extrabold text-primary tracking-tight">Mution</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#fitur" className="hover:text-foreground transition-colors">Fitur</a>
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
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Masuk</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Daftar Gratis</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-orange-600/5 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground font-medium mb-10 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Platform sudah aktif · 99.9% uptime
            <ChevronRight className="h-3 w-3" />
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
            Infrastruktur yang<br />
            <span className="text-primary">siap dalam menit.</span>
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Mution membantu tim developer men-deploy, mengelola, dan men-scale aplikasi tanpa perlu mengurus server, Docker, atau konfigurasi infrastruktur yang rumit.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base px-8 gap-2 h-12 font-semibold">
                Mulai Gratis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 border-border/60">
                Masuk ke Dashboard
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground/70">Tidak perlu kartu kredit · Tier gratis tersedia</p>

          {/* Stats strip */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/40">
            {stats.map((s) => (
              <div key={s.label} className="bg-card/60 backdrop-blur-sm px-6 py-5 text-center">
                <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
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

      {/* Features */}
      <section id="fitur" className="py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Semua yang kamu butuhkan untuk ship</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Dari deployment hingga monitoring — Mution siap mendukung kamu end-to-end.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 hover:bg-card/80 transition-all">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Mulai gratis, scale saat kamu siap.
            </p>
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
                  <div className="mb-3 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                    Paling Populer
                  </div>
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
                  <Button
                    className="mt-8 w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Siap deploy aplikasi pertamamu?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Bergabung dengan ribuan developer yang sudah hosting di Mution. Siap dalam kurang dari 5 menit.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
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
      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/mution-logo.png" alt="Mution" className="h-6 w-auto" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-sm font-extrabold text-primary">Mution</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mution. Semua hak dilindungi.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privasi</a>
            <a href="#" className="hover:text-foreground transition-colors">Ketentuan</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
