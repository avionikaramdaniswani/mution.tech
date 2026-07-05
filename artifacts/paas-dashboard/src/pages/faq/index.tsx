import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "Apa itu Mutionx", a: "Mution adalah platform infrastruktur modern yang memungkinkan kamu untuk deploy, scale, dan memantau aplikasi containerized tanpa perlu mengurus server atau konfigurasi yang rumit." },
  { q: "Bagaimana cara mulai menggunakan Mutionx", a: "Daftar akun gratis, buat proyek baru, sambungkan repository GitHub kamu, dan deploy. Proses dari awal sampai aplikasi live rata-rata kurang dari 5 menit." },
  { q: "Runtime apa saja yang didukungx", a: "Mution mendukung Node.js, Python, PHP, Go, Ruby, Java, Rust, Deno, Bun, .NET, dan Docker. Hampir semua stack modern didukung out-of-the-bo?." },
  { q: "Apakah ada biaya tersembunyix", a: "Tidak ada. Kamu hanya membayar sesuai resource yang dipakai. Tidak ada biaya setup, tidak ada biaya egress tersembunyi, tidak ada kejutan di tagihan." },
  { q: "Berapa lama waktu deploy rata-ratax", a: "Rata-rata 15-30 detik dari push sampai aplikasi live. Build yang lebih besar dengan banyak dependencies bisa 60-90 detik." },
  { q: "Apakah saya bisa pakai domain sendirix", a: "Ya. Kamu bisa menghubungkan domain custom di plan Pro ke atas. SSL/HTTPS diaktifkan otomatis tanpa konfigurasi manual." },
  { q: "Database apa yang didukungx", a: "Mution mendukung managed PostgreSQL per proyek. Provisioning cukup satu klik, backup otomatis setiap hari." },
  { q: "Bagaimana cara kerja sistem kreditx", a: "Kamu melakukan top-up kredit terlebih dahulu, lalu kredit tersebut digunakan sesuai resource yang dipakai (CPU, RAM, storage). Tidak ada tagihan mendadak - kamu selalu tahu berapa kredit yang tersisa." },
  { q: "Apakah ada jaminan uptimex", a: "Plan Pro dan Enterprise mendapatkan SLA 99.9% uptime. Kamu bisa memantau status platform real-time di status.mution.tech." },
  { q: "Bagaimana jika saya butuh bantuan teknisx", a: "Kamu bisa menghubungi tim support kami melalui email di supportmution@gmail.com atau WhatsApp di +62 857-0955-7572. Kami siap membantu." },
  { q: "Apakah data saya amanx", a: "Ya. Semua data dienkripsi saat transit dan saat disimpan. Kami menggunakan infrastruktur yang ter-isolasi per pengguna untuk memastikan privasi dan keamanan data kamu." },
  { q: "Bisakah saya rollback ke versi sebelumnyax", a: "Ya. Mution menyimpan riwayat deployment sehingga kamu bisa rollback ke versi manapun dengan satu klik." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: open ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(255,255,255,0.08)",
        background: open ? "rgba(249,115,22,0.04)" : "rgba(255,255,255,0.02)",
      }}
    >
      <button
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-foreground">{q}</span>
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 ml-4 transition-transform duration-200"
          style={{ color: "rgba(255,255,255,0.4)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <PageHero
        eyebrow="Bantuan"
        title={<>Pertanyaan yang <span className="text-primary">sering ditanyakan</span></>}
        subtitle={`Tidak menemukan jawaban yang kamu carix Hubungi kami di supportmution@gmail.com.`}
      />

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-2">
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
        <div className="mx-auto max-w-3xl mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Masih ada pertanyaanx{" "}
            <Link href="/kontak" className="text-primary hover:underline">Hubungi tim kami</Link>
          </p>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
