import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Apa itu Mution?",
    a: "Mution adalah platform infrastruktur modern yang memungkinkan kamu untuk deploy, scale, dan memantau aplikasi containerized tanpa perlu mengurus server atau konfigurasi yang rumit.",
  },
  {
    q: "Bagaimana cara mulai menggunakan Mution?",
    a: "Daftar akun gratis, buat proyek baru, sambungkan repository GitHub kamu, dan deploy. Proses dari awal sampai aplikasi live rata-rata kurang dari 5 menit.",
  },
  {
    q: "Runtime apa saja yang didukung?",
    a: "Mution mendukung Node.js, Python, PHP, Go, Ruby, Java, Rust, Deno, Bun, .NET, dan Docker. Hampir semua stack modern didukung out-of-the-box.",
  },
  {
    q: "Apakah ada biaya tersembunyi?",
    a: "Tidak ada. Kamu hanya membayar sesuai resource yang dipakai. Tidak ada biaya setup, tidak ada biaya egress tersembunyi, tidak ada kejutan di tagihan.",
  },
  {
    q: "Berapa lama waktu deploy rata-rata?",
    a: "Rata-rata 15–30 detik dari push sampai aplikasi live. Build yang lebih besar dengan banyak dependencies bisa 60–90 detik.",
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
    q: "Bagaimana cara kerja sistem kredit?",
    a: "Kamu melakukan top-up kredit terlebih dahulu, lalu kredit tersebut digunakan sesuai resource yang dipakai (CPU, RAM, storage). Tidak ada tagihan mendadak — kamu selalu tahu berapa kredit yang tersisa.",
  },
  {
    q: "Apakah ada jaminan uptime?",
    a: "Plan Pro dan Enterprise mendapatkan SLA 99.9% uptime. Kamu bisa memantau status platform real-time di status.mution.tech.",
  },
  {
    q: "Bagaimana jika saya butuh bantuan teknis?",
    a: "Kamu bisa menghubungi tim support kami melalui email di supportmution@gmail.com atau WhatsApp di +62 857-0955-7572. Kami siap membantu.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya. Semua data dienkripsi saat transit dan saat disimpan. Kami menggunakan infrastruktur yang ter-isolasi per pengguna untuk memastikan privasi dan keamanan data kamu.",
  },
  {
    q: "Bisakah saya rollback ke versi sebelumnya?",
    a: "Ya. Mution menyimpan riwayat deployment sehingga kamu bisa rollback ke versi manapun dengan satu klik.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/50">
      <button
        className="flex w-full items-center justify-between py-5 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 ml-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            Pertanyaan yang Sering Ditanyakan
          </h1>
          <p className="text-muted-foreground text-lg">
            Tidak menemukan jawaban yang kamu cari?{" "}
            <Link href="/kontak" className="text-primary hover:underline">
              Hubungi kami
            </Link>
            .
          </p>
        </div>
        <div className="divide-y divide-border/50 border-t border-border/50">
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </main>
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mution. All rights reserved.
      </footer>
    </div>
  );
}
