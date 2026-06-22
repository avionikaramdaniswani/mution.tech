import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  ChevronDown,
} from "lucide-react";
import {
  SiNodedotjs,
  SiPython,
  SiPhp,
  SiGo,
  SiRuby,
  SiRust,
  SiDeno,
  SiBun,
  SiDotnet,
  SiDocker,
} from "react-icons/si";
import { FaJava } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";

const runtimes = [
  { label: "Node.js",  Icon: SiNodedotjs, color: "#5FA04E" },
  { label: "Python",   Icon: SiPython,    color: "#3776AB" },
  { label: "PHP",      Icon: SiPhp,       color: "#777BB4" },
  { label: "Static",   Icon: Globe,       color: "#94a3b8" },
  { label: "Go",       Icon: SiGo,        color: "#00ADD8" },
  { label: "Ruby",     Icon: SiRuby,      color: "#CC342D" },
  { label: "Java",     Icon: FaJava,      color: "#ED8B00" },
  { label: "Rust",     Icon: SiRust,      color: "#CE422B" },
  { label: "Deno",     Icon: SiDeno,      color: "#ffffff" },
  { label: "Bun",      Icon: SiBun,       color: "#FBF0DF" },
  { label: ".NET",     Icon: SiDotnet,    color: "#512BD4" },
  { label: "Docker",   Icon: SiDocker,    color: "#2496ED" },
];

const terminalLines = [
  { delay: 0,    text: "$ git push origin main",                  color: "rgba(255,255,255,0.85)" },
  { delay: 700,  text: "Counting objects: 12, done.",              color: "rgba(255,255,255,0.35)" },
  { delay: 1100, text: "Writing objects: 100% (12/12) · 4.2 KiB", color: "rgba(255,255,255,0.35)" },
  { delay: 1700, text: "remote: Mution — deploy triggered ⚡",    color: "rgba(249,115,22,0.9)"  },
  { delay: 2300, text: "remote: Detecting runtime... Node.js 20", color: "rgba(255,255,255,0.45)" },
  { delay: 2900, text: "remote: Installing dependencies...",       color: "rgba(255,255,255,0.45)" },
  { delay: 3600, text: "remote: npm install · 47 packages · 8s",  color: "rgba(255,255,255,0.35)" },
  { delay: 4300, text: "remote: Building... npm run build",        color: "rgba(255,255,255,0.45)" },
  { delay: 5100, text: "remote: Build succeeded in 11.4s ✓",      color: "rgba(249,115,22,0.8)"  },
  { delay: 5800, text: "remote: Deploying container...",           color: "rgba(255,255,255,0.45)" },
  { delay: 6600, text: "remote: SSL certificate provisioned ✓",   color: "rgba(255,255,255,0.35)" },
  { delay: 7200, text: "remote: ● Live → my-api.mution.app",      color: "#4ade80"               },
];

const faqs = [
  {
    q: "Apakah ada biaya tersembunyi?",
    a: "Tidak. Kamu hanya membayar sesuai resource yang dipakai. Tidak ada biaya setup, tidak ada biaya egress tersembunyi.",
  },
  {
    q: "Berapa lama waktu deploy rata-rata?",
    a: "Rata-rata 15–30 detik dari git push sampai aplikasi live. Build yang lebih besar dengan banyak dependencies bisa 60–90 detik.",
  },
  {
    q: "Apakah saya bisa pakai domain sendiri?",
    a: "Ya. Kamu bisa menghubungkan domain custom di plan Pro ke atas. SSL/HTTPS diaktifkan otomatis tanpa konfigurasi manual.",
  },
  {
    q: "Database apa yang didukung?",
    a: "Mution mendukung managed PostgreSQL per proyek. Provisioning cukup satu klik, backup otomatis setiap hari.",
  },
  {
    q: "Bagaimana cara kerja billing pay-as-you-go?",
    a: "Kamu ditagih berdasarkan CPU dan RAM aktual yang dipakai per jam. Jika aplikasi tidak berjalan, tidak ada tagihan.",
  },
  {
    q: "Apakah ada jaminan uptime?",
    a: "Plan Pro dan Enterprise mendapatkan SLA 99.9% uptime. Kamu bisa memantau status platform real-time di status.mution.tech.",
  },
];

const resourceRates = [
  { label: "vCPU",      rate: "Rp 85",  unit: "/ vCPU / jam",   desc: "Per core aktif" },
  { label: "RAM",       rate: "Rp 45",  unit: "/ GB / jam",     desc: "Diukur per jam" },
  { label: "Storage",   rate: "Rp 150", unit: "/ GB / bulan",   desc: "Persistent disk" },
  { label: "Bandwidth", rate: "Rp 120", unit: "/ GB keluar",    desc: "Ingress gratis" },
];

const usageExamples = [
  { name: "Side project kecil",  spec: "0.5 vCPU · 256 MB · 8 jam/hari", price: "~Rp 9rb" },
  { name: "REST API produksi",   spec: "1 vCPU · 512 MB · aktif 24 jam",  price: "~Rp 55rb" },
  { name: "Full-stack app",      spec: "2 vCPU · 1 GB · aktif 24 jam",    price: "~Rp 160rb" },
  { name: "Multi-service",       spec: "4 vCPU · 4 GB · aktif 24 jam",    price: "~Rp 570rb" },
];

const billingSteps = [
  { step: "01", title: "Deploy aplikasi",    desc: "Container berjalan → resource mulai dihitung per detik." },
  { step: "02", title: "Stop kapan saja",    desc: "Container berhenti → tagihan langsung berhenti. Tidak ada idle cost." },
  { step: "03", title: "Bayar di akhir bulan", desc: "Invoice otomatis berdasarkan total detik aktif × rate resource." },
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
  const [visibleLines, setVisibleLines] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const animStarted = useRef(false);

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

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animStarted.current) {
          animStarted.current = true;
          terminalLines.forEach((line, i) => {
            setTimeout(() => setVisibleLines(i + 1), line.delay);
          });
          const totalDuration = terminalLines[terminalLines.length - 1].delay + 3000;
          setTimeout(() => {
            animStarted.current = false;
            setVisibleLines(0);
          }, totalDuration);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
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

      {/* Runtimes — infinite marquee */}
      <section id="runtime" className="border-y border-border/50 bg-card/20 py-10 overflow-hidden">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-7">Runtime yang Didukung</p>

        {/* fade masks on left & right */}
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10"
            style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }} />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10"
            style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }} />

          {/* scrolling track */}
          <div className="flex" style={{ animation: "marquee 28s linear infinite" }}>
            {/* duplicate so it loops seamlessly */}
            {[...runtimes, ...runtimes].map(({ label, Icon, color }, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-5 py-2.5 text-sm font-medium text-foreground mx-2"
              >
                <Icon style={{ color, flexShrink: 0 }} className="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* Terminal Animasi */}
      <section className="py-24 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Teks kiri */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">Deploy dalam hitungan detik</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                Push kode.<br />
                <span className="text-primary">Sisanya urusan kami.</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Cukup <code className="text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-mono">git push</code> — Mution otomatis mendeteksi runtime, install dependencies, build, dan deploy. SSL aktif, domain siap, tanpa konfigurasi manual.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  "Runtime terdeteksi otomatis",
                  "Zero-downtime deployment",
                  "SSL otomatis tanpa konfigurasi",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal */}
            <div
              ref={terminalRef}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(6,6,14,0.95)" }}
            >
              {/* Chrome bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,80,80,0.5)" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,190,0,0.4)" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,200,80,0.4)" }} />
                <span className="ml-3 text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>bash — 80×24</span>
              </div>
              {/* Lines */}
              <div className="p-5 font-mono text-[13px] leading-relaxed min-h-[320px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {terminalLines.slice(0, visibleLines).map((line, i) => (
                  <div
                    key={i}
                    className="transition-opacity duration-300"
                    style={{ color: line.color, opacity: 1 }}
                  >
                    {line.text}
                  </div>
                ))}
                {visibleLines < terminalLines.length && (
                  <span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "rgba(249,115,22,0.7)" }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="border-t border-border/50 bg-card/20 py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">Harga</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Pay As You Go. Tidak ada tier.</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-lg mx-auto">
              Bayar per resource yang benar-benar dipakai. Container mati = tagihan nol.
            </p>
          </div>

          {/* Free credit banner */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl px-6 py-5 mb-10"
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.15)" }}>
                <span className="text-base">🎁</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Rp 100.000 kredit gratis untuk akun baru</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tidak perlu kartu kredit. Kredit hangus setelah 30 hari.</p>
              </div>
            </div>
            <Link href="/register" className="flex-shrink-0">
              <Button size="sm" className="font-semibold px-6">Daftar Sekarang</Button>
            </Link>
          </div>

          {/* Resource rate grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {resourceRates.map(r => (
              <div
                key={r.label}
                className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-1"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{r.label}</p>
                <p className="text-2xl font-extrabold text-foreground leading-none mt-1">{r.rate}</p>
                <p className="text-xs text-muted-foreground">{r.unit}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-auto pt-2 border-t border-border/30">{r.desc}</p>
              </div>
            ))}
          </div>

          {/* Two columns: how billing works + usage examples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

            {/* How billing works */}
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <p className="text-sm font-semibold mb-5">Cara kerja billing</p>
              <div className="space-y-5">
                {billingSteps.map(s => (
                  <div key={s.step} className="flex gap-4">
                    <span
                      className="flex-shrink-0 text-xs font-bold font-mono mt-0.5"
                      style={{ color: "rgba(249,115,22,0.7)" }}
                    >{s.step}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage examples */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40">
                <p className="text-sm font-semibold">Estimasi tagihan / bulan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tagihan aktual mungkin lebih rendah.</p>
              </div>
              <div className="divide-y divide-border/30">
                {usageExamples.map(ex => (
                  <div key={ex.name} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{ex.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{ex.spec}</p>
                    </div>
                    <span className="text-sm font-bold text-primary flex-shrink-0 ml-4">{ex.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Included in all accounts */}
          <div className="rounded-xl border border-border/50 bg-card/40 px-6 py-5 mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">Sudah termasuk di semua akun</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2.5">
              {[
                "SSL otomatis", "Custom domain", "Database managed",
                "Deploy unlimited", "Auto-scaling", "Rollback 1-klik",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise strip */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl px-6 py-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div>
              <p className="text-sm font-semibold">Butuh SLA, on-premise, atau volume discount?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enterprise tersedia dengan harga kustom, audit log, SSO/SAML, dan account manager.</p>
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0">Hubungi Kami</Button>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Pertanyaan yang sering ditanyakan</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border overflow-hidden transition-colors"
                style={{ borderColor: openFaq === i ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.08)", background: openFaq === i ? "rgba(249,115,22,0.04)" : "rgba(255,255,255,0.02)" }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                  <ChevronDown
                    className="h-4 w-4 flex-shrink-0 ml-4 transition-transform duration-200"
                    style={{ color: "rgba(255,255,255,0.4)", transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <p className="pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
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
