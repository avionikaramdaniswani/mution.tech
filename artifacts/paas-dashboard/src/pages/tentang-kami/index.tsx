import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";
import { ArrowRight, Zap, Shield, Globe, HeartHandshake } from "lucide-react";

const values = [
  { icon: Zap, title: "Kecepatan", desc: "Deploy dalam hitungan detik, bukan jam. Kami percaya waktu developer adalah aset paling berharga." },
  { icon: Shield, title: "Keandalan", desc: "Infrastruktur yang stabil dan aman. SLA 99.9% uptime untuk bisnis yang tidak boleh berhenti." },
  { icon: Globe, title: "Terbuka", desc: "Tidak ada vendor lock-in. Standar terbuka, teknologi yang kamu sudah kenal - Docker, Git, PostgreSQL." },
  { icon: HeartHandshake, title: "Pengguna Pertama", desc: "Setiap keputusan produk kami didorong oleh kebutuhan nyata developer, bukan metrik vanity." },
];

const team = [
  { name: "Pioo", role: "Co-founder & CEO", desc: "Memimpin visi produk dan pengembangan platform. Berpengalaman di infrastruktur cloud dan developer tools." },
  { name: "Tiara", role: "Co-founder", desc: "Memimpin operasional, pertumbuhan, dan hubungan dengan pengguna. Passionate tentang ekosistem teknologi Indonesia." },
];

const timeline = [
  { year: "2024", event: "Mution mulai dikembangkan - mimpi platform PaaS lokal terbaik Indonesia" },
  { year: "2025", event: "Versi Beta diluncurkan, onboarding pengguna awal dan proyek-proyek pertama" },
  { year: "2026", event: "Rilis publik - multi-runtime, managed database, billing kredit, dan terus berkembang" },
];

const cardStyle = { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" };

export default function TentangKamiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <PageHero
        eyebrow="Tentang Mution"
        title={<>Infrastruktur yang dibangun <br /><span className="text-primary">untuk developer Indonesia.</span></>}
        subtitle="Mution lahir dari frustrasi yang sama yang dirasakan ribuan developer - deploy seharusnya mudah, bukan pekerjaan sampingan yang menyita waktu."
      />

      {/* Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Cerita Kami</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Dari frustrasi jadi solusi</h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>Mution dimulai pada 2024 ketika kami, sebagai developer, lelah dengan kompleksitas setup server, konfigurasi nginx, SSL manual, dan semua kerumitan yang seharusnya tidak perlu ada.</p>
                <p>Platform seperti Railway dan Render luar biasa, tapi harga dan latensi ke server luar negeri menjadi hambatan bagi tim dan startup Indonesia. Kami ingin solusi yang sama hebatnya, tapi lebih dekat - secara infrastruktur maupun pemahaman konteks lokal.</p>
                <p>Mution hadir sebagai jawaban: PaaS modern yang dibangun di atas VM sendiri, dengan harga transparan dalam Rupiah, dan dukungan teknis yang benar-benar paham kebutuhanmu.</p>
              </div>
            </div>
            <div className="space-y-3">
              {timeline.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl transition-colors" style={cardStyle}>
                  <div className="flex-shrink-0 text-xs font-bold text-primary pt-0.5">{item.year}</div>
                  <p className="text-sm text-muted-foreground">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Nilai Kami</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Apa yang kami percaya</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl transition-colors hover:border-primary/30 hover:bg-white/[0.04]" style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Tim Pendiri</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Orang-orang di balik Mution</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="p-6 rounded-xl transition-colors hover:bg-white/[0.04]" style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary flex-shrink-0" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
                    {member.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-xs text-primary">{member.role}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 60%)" }}>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 text-white">Bergabung bersama kami</h2>
            <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
              Mulai gratis hari ini - tanpa kartu kredit, tanpa konfigurasi rumit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <button className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-3 transition-all duration-200" style={{ background: "rgb(249,115,22)", color: "#fff", boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 24px rgba(249,115,22,0.35)" }}>
                  Mulai Gratis <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/kontak">
                <button className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-3 transition-colors text-foreground" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
                  Hubungi Kami
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
