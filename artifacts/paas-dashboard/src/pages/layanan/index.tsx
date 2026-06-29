import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";
import {
  Server, Cpu, Database, Globe, Shield, Zap,
  Bot, BrainCircuit, Key, BarChart3, Layers, ArrowRight,
} from "lucide-react";

const hostingFeatures = [
  { icon: Server, title: "Deploy dari Git", desc: "Hubungkan repo GitHub kamu, push — Mution langsung build dan deploy otomatis." },
  { icon: Layers, title: "Multi-runtime", desc: "Node.js, Python, Go, PHP, Ruby, dan Docker image custom didukung penuh." },
  { icon: Database, title: "Managed Database", desc: "PostgreSQL dan MySQL terkelola — backup otomatis, akses mudah lewat dashboard." },
  { icon: Globe, title: "Domain & SSL", desc: "Subdomain gratis bawaan Mution, atau hubungkan domain sendiri dengan SSL otomatis." },
  { icon: Shield, title: "Isolasi Container", desc: "Setiap proyek berjalan di container terisolasi — aman, stabil, tidak saling ganggu." },
  { icon: Zap, title: "Auto-scaling", desc: "Resource naik saat traffic lonjak, turun saat sepi. Bayar apa yang kamu pakai." },
];

const aiFeatures = [
  { icon: Bot, title: "Satu Key, Semua Model", desc: "GPT-4o, Claude 3.5, Gemini 1.5, Llama 3, Mistral — akses lewat satu API key." },
  { icon: BrainCircuit, title: "OpenAI-Compatible", desc: "Endpoint kompatibel OpenAI. Tidak perlu ubah kode — ganti base URL, langsung jalan." },
  { icon: Cpu, title: "Tanpa Manajemen Quota", desc: "Tidak perlu daftar ke puluhan provider. Kami kelola rate limit dan fallback untuk kamu." },
  { icon: Key, title: "API Key Terkelola", desc: "Buat dan revoke key kapan saja lewat dashboard. Setiap key bisa dibatasi scope-nya." },
  { icon: BarChart3, title: "Usage Tracking", desc: "Pantau token yang dipakai per key, per model, per hari — transparan dan real-time." },
  { icon: Shield, title: "Harga Kredit Transparan", desc: "Pakai kredit yang sama dengan layanan hosting. Satu saldo, semua layanan." },
];

const cardStyle = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
};

const cardHoverStyle = (primary = true) => primary
  ? "hover:border-primary/40 hover:bg-white/[0.04]"
  : "hover:border-indigo-500/40 hover:bg-white/[0.04]";

export default function LayananPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <PageHero
        eyebrow="Layanan Mution"
        title={<>Dua layanan, satu platform, <span className="text-primary">satu saldo.</span></>}
        subtitle="Mution menyediakan infrastruktur hosting modern dan akses AI multi-model — semuanya terintegrasi dalam satu dashboard dan satu sistem kredit."
      />

      {/* Hosting */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", color: "rgb(249,115,22)" }}
              >
                <Server className="h-3.5 w-3.5" />
                Layanan 01
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Hosting & Deployment</h2>
              <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                Deploy aplikasimu dalam hitungan detik. Infrastruktur container modern berbasis VM sendiri — tidak ada cold start, tidak ada kejutan biaya.
              </p>
            </div>
            <Link href="/register">
              <button
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-5 py-2.5 transition-all duration-200 whitespace-nowrap"
                style={{ background: "rgb(249,115,22)", color: "#fff", boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 20px rgba(249,115,22,0.3)" }}
              >
                Mulai Deploy <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hostingFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`p-5 rounded-xl transition-colors ${cardHoverStyle(true)}`} style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
      </div>

      {/* AI API */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "rgb(129,140,248)" }}
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                Layanan 02
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">AI API Gateway</h2>
              <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                Akses puluhan model AI terbaik dunia lewat satu endpoint. Kompatibel OpenAI — tinggal ganti base URL, tidak perlu ubah kode lama kamu.
              </p>
            </div>
            <Link href="/register">
              <button className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-5 py-2.5 transition-all duration-200 whitespace-nowrap text-foreground" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
                Coba Gratis <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {aiFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`p-5 rounded-xl transition-colors ${cardHoverStyle(false)}`} style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <Icon className="h-4 w-4" style={{ color: "rgb(129,140,248)" }} />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-2xl p-12 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 60%)" }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 text-white">Mulai pakai Mution hari ini</h2>
            <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
              Daftar gratis, dapatkan kredit awal, dan deploy proyek pertamamu dalam menit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-3 transition-all duration-200" style={{ background: "rgb(249,115,22)", color: "#fff", boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 24px rgba(249,115,22,0.35)" }}>
                  Daftar Gratis <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/harga">
                <button className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-3 transition-colors text-foreground" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
                  Lihat Harga
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
