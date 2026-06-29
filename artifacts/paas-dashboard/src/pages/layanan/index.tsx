import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
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

export default function LayananPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      {/* Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
            Layanan Mution
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Dua layanan, satu platform,{" "}
            <span className="text-primary">satu saldo.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Mution menyediakan infrastruktur hosting modern dan akses AI multi-model — semuanya terintegrasi dalam satu dashboard dan satu sistem kredit.
          </p>
        </div>
      </section>

      {/* Service 1 — Hosting */}
      <section className="border-t border-border/40 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{
                  background: "rgba(249,115,22,0.12)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "rgb(249,115,22)",
                }}
              >
                <Server className="h-3.5 w-3.5" />
                Layanan 01
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Hosting & Deployment
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                Deploy aplikasimu dalam hitungan detik. Infrastruktur container modern berbasis VM sendiri — tidak ada cold start, tidak ada kejutan biaya.
              </p>
            </div>
            <Link href="/register">
              <button
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-5 py-2.5 transition-all duration-200 whitespace-nowrap"
                style={{
                  background: "rgb(249,115,22)",
                  color: "#fff",
                  boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 20px rgba(249,115,22,0.3)",
                }}
              >
                Mulai Deploy <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hostingFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-border/50 bg-card/20 hover:border-primary/30 hover:bg-card/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(249,115,22,0.10)",
                      border: "1px solid rgba(249,115,22,0.2)",
                    }}
                  >
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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="border-t border-border/40" />
      </div>

      {/* Service 2 — AI API */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "rgb(129,140,248)",
                }}
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                Layanan 02
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                AI API Gateway
              </h2>
              <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                Akses puluhan model AI terbaik dunia lewat satu endpoint. Kompatibel OpenAI — tinggal ganti base URL, tidak perlu ubah kode lama kamu.
              </p>
            </div>
            <Link href="/register">
              <button
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-5 py-2.5 transition-all duration-200 whitespace-nowrap border border-border/60 bg-card/30 hover:border-border hover:bg-card/60 text-foreground"
              >
                Coba Gratis <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-border/50 bg-card/20 hover:border-indigo-500/30 hover:bg-card/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(99,102,241,0.10)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
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
      <section className="border-t border-border/40 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Mulai pakai Mution hari ini
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Daftar gratis, dapatkan kredit awal, dan deploy proyek pertamamu dalam menit.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <button
                className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-3 transition-all duration-200"
                style={{
                  background: "rgb(249,115,22)",
                  color: "#fff",
                  boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 24px rgba(249,115,22,0.35)",
                }}
              >
                Daftar Gratis <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/harga">
              <button className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-3 border border-border/60 bg-card/30 hover:border-border transition-colors text-muted-foreground hover:text-foreground">
                Lihat Harga
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Mution. Dibuat di Indonesia 🇮🇩</p>
          <div className="flex gap-4">
            <Link href="/tentang-kami" className="hover:text-foreground transition-colors">Tentang Kami</Link>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privasi</Link>
            <Link href="/kontak" className="hover:text-foreground transition-colors">Kontak</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
