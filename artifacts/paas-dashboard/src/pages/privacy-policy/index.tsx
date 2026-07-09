import {
  ArrowRight,
  CheckCircle2,
  Cookie,
  Database,
  Eye,
  FileText,
  LockKeyhole,
  Mail,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";

const privacyHighlights: { label: string; desc: string; Icon: LucideIcon }[] = [
  {
    label: "Data tidak dijual",
    desc: "Mution tidak menjual data pribadi kamu kepada pihak ketiga.",
    Icon: ShieldCheck,
  },
  {
    label: "Data proyek dilindungi",
    desc: "Data sensitif proyek diperlakukan dengan kontrol keamanan yang sesuai.",
    Icon: LockKeyhole,
  },
  {
    label: "Sesi akun dilindungi",
    desc: "Sesi pengguna dikelola dengan mekanisme keamanan yang sesuai.",
    Icon: Cookie,
  },
];

const tableOfContents = [
  { id: "pendahuluan", label: "Pendahuluan" },
  { id: "informasi", label: "Informasi yang dikumpulkan" },
  { id: "penggunaan", label: "Penggunaan informasi" },
  { id: "keamanan", label: "Penyimpanan & keamanan" },
  { id: "pihak-ketiga", label: "Pihak ketiga" },
  { id: "cookie", label: "Cookie" },
  { id: "hak-data", label: "Hak atas data" },
  { id: "retensi", label: "Retensi data" },
  { id: "perubahan", label: "Perubahan kebijakan" },
  { id: "kontak", label: "Kontak" },
];

const policySections: {
  id: string;
  title: string;
  summary: string;
  Icon: LucideIcon;
  content: ReactNode;
}[] = [
  {
    id: "pendahuluan",
    title: "1. Pendahuluan",
    summary: "Komitmen dasar Mution dalam melindungi privasi pengguna.",
    Icon: FileText,
    content: (
      <p>
        Mution ("kami", "kita") berkomitmen untuk melindungi privasi kamu. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi kamu saat menggunakan layanan kami di mution.tech.
      </p>
    ),
  },
  {
    id: "informasi",
    title: "2. Informasi yang Kami Kumpulkan",
    summary: "Jenis data yang dibutuhkan agar layanan Mution dapat berjalan.",
    Icon: Database,
    content: (
      <>
        <p>Kami mengumpulkan informasi berikut saat kamu menggunakan layanan Mution:</p>
        <ul className="mt-4 grid gap-3">
          {[
            ["Informasi Akun", "Nama, alamat email, dan informasi autentikasi yang diperlukan."],
            ["Data Penggunaan", "Log aktivitas, waktu login, dan tindakan di dalam platform."],
            ["Data Proyek", "Nama proyek, konfigurasi, data teknis proyek, dan log deployment yang diperlukan."],
            ["Data Teknis", "Alamat IP, jenis browser, sistem operasi, dan informasi perangkat."],
            ["Data Transaksi", "Riwayat topup kredit dan penggunaan resource."],
          ].map(([label, value]) => (
            <li key={label} className="flex gap-3 rounded-md border border-[#dbe8f3] bg-[#f8fbff] p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#14b8a6]" />
              <span>
                <strong className="font-bold text-[#172033]">{label}:</strong> {value}
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "penggunaan",
    title: "3. Cara Kami Menggunakan Informasi",
    summary: "Tujuan penggunaan data untuk operasional, keamanan, dan peningkatan layanan.",
    Icon: Eye,
    content: (
      <>
        <p>Informasi yang dikumpulkan digunakan untuk:</p>
        <ul className="mt-4 grid gap-2">
          {[
            "Menyediakan, mengoperasikan, dan meningkatkan layanan Mution.",
            "Memproses transaksi dan mengelola kredit akun kamu.",
            "Mengirimkan notifikasi penting terkait layanan, seperti gangguan layanan, pembaruan, dan keamanan.",
            "Mendeteksi dan mencegah penyalahgunaan, penipuan, dan aktivitas ilegal.",
            "Menganalisis penggunaan platform untuk meningkatkan pengalaman pengguna.",
            "Memenuhi kewajiban hukum yang berlaku.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#14b8a6]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "keamanan",
    title: "4. Penyimpanan dan Keamanan Data",
    summary: "Komitmen perlindungan data tanpa membuka detail konfigurasi internal.",
    Icon: Server,
    content: (
      <>
        <p>
          Kami menerapkan langkah-langkah keamanan teknis dan organisasional yang wajar untuk melindungi data dari akses tidak sah, penyalahgunaan, perubahan, atau pengungkapan yang tidak sah.
        </p>
        <p className="mt-4 rounded-md border border-[#fed7aa] bg-[#fff7ed] p-4 text-[#7c2d12]">
          Data sensitif proyek diperlakukan dengan pembatasan akses dan perlindungan tambahan sesuai kebutuhan layanan.
        </p>
      </>
    ),
  },
  {
    id: "pihak-ketiga",
    title: "5. Berbagi Data dengan Pihak Ketiga",
    summary: "Kapan data dapat dibagikan, dan batasannya.",
    Icon: Scale,
    content: (
      <>
        <p>
          Kami <strong className="font-bold text-[#172033]">tidak menjual</strong> data pribadi kamu kepada pihak ketiga. Kami dapat berbagi informasi dalam situasi terbatas berikut:
        </p>
        <ul className="mt-4 grid gap-3">
          {[
            ["Penyedia Infrastruktur", "Mitra infrastruktur yang membantu pengoperasian platform sesuai perjanjian perlindungan data."],
            ["Pemroses Pembayaran", "Mitra pembayaran yang membantu memproses transaksi kredit."],
            ["Kewajiban Hukum", "Jika diwajibkan oleh hukum atau perintah pengadilan yang sah."],
          ].map(([label, value]) => (
            <li key={label} className="rounded-md border border-[#dbe8f3] bg-white p-3">
              <strong className="font-bold text-[#172033]">{label}</strong>
              <p className="mt-1">{value}</p>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "cookie",
    title: "6. Cookie dan Teknologi Pelacakan",
    summary: "Penggunaan cookie yang diperlukan untuk layanan.",
    Icon: Cookie,
    content: (
      <p>
        Mution menggunakan cookie yang diperlukan untuk mengelola sesi login dan menjaga layanan tetap berjalan. Cookie ini tidak digunakan untuk pelacakan iklan, dan kami tidak menggunakan cookie pihak ketiga untuk keperluan pemasaran.
      </p>
    ),
  },
  {
    id: "hak-data",
    title: "7. Hak Kamu atas Data Pribadi",
    summary: "Hak akses, koreksi, penghapusan, dan portabilitas data.",
    Icon: UserCheck,
    content: (
      <>
        <p>Sesuai peraturan yang berlaku, kamu memiliki hak untuk:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Akses", "Meminta salinan data pribadi yang kami simpan tentang kamu."],
            ["Koreksi", "Memperbarui data yang tidak akurat melalui halaman Profil."],
            ["Penghapusan", "Meminta penghapusan akun dan data terkait."],
            ["Portabilitas", "Meminta ekspor data proyek dan aktivitas kamu."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[#dbe8f3] bg-[#f8fbff] p-4">
              <p className="font-bold text-[#172033]">{label}</p>
              <p className="mt-1 text-sm leading-6">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4">
          Untuk menggunakan hak-hak ini, hubungi kami di{" "}
          <a href="mailto:supportmution@gmail.com" className="font-semibold text-[#f97316] hover:underline">
            supportmution@gmail.com
          </a>.
        </p>
      </>
    ),
  },
  {
    id: "retensi",
    title: "8. Retensi Data",
    summary: "Berapa lama data akun aktif disimpan.",
    Icon: Database,
    content: (
      <p>
        Data akun aktif disimpan selama akun kamu aktif. Jika kamu menghapus akun, data akan dihapus dalam 30 hari, kecuali jika kami diwajibkan menyimpannya lebih lama oleh hukum, misalnya data transaksi keuangan.
      </p>
    ),
  },
  {
    id: "perubahan",
    title: "9. Perubahan Kebijakan Privasi",
    summary: "Cara Mution memberi tahu perubahan penting.",
    Icon: RefreshCw,
    content: (
      <p>
        Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Jika ada perubahan signifikan, kami akan memberikan pemberitahuan melalui email atau notifikasi di platform. Penggunaan Layanan setelah perubahan dianggap sebagai penerimaan kebijakan baru.
      </p>
    ),
  },
  {
    id: "kontak",
    title: "10. Hubungi Kami",
    summary: "Kontak resmi untuk pertanyaan privasi.",
    Icon: Mail,
    content: (
      <>
        <p>Jika kamu memiliki pertanyaan atau kekhawatiran tentang Kebijakan Privasi ini, silakan hubungi kami:</p>
        <a
          href="mailto:supportmution@gmail.com"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]"
        >
          supportmution@gmail.com
          <ArrowRight className="h-4 w-4" />
        </a>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033]">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#dbe8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_58%,#fff7ed_100%)] px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,0.08),rgba(20,184,166,0.08)_44%,transparent_72%)]" />

          <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Legal Mution</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-normal text-[#172033] sm:text-6xl">
                Kebijakan Privasi
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                Cara Mution mengumpulkan, menggunakan, menyimpan, dan melindungi data saat kamu menggunakan layanan di mution.tech.
              </p>

              <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-[#526173]">
                {["Terakhir diperbarui: Juni 2026", "Cookie layanan", "Kontrol keamanan internal"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-md border border-[#dbe8f3] bg-white/80 px-3 py-2 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#14b8a6]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <aside className="rounded-md border border-[#dbe8f3] bg-white p-5 shadow-[0_24px_70px_rgba(23,32,51,0.10)]">
              <div className="flex items-center gap-3 border-b border-[#dbe8f3] pb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-md border border-[#fed7aa] bg-[#fff7ed] text-[#f97316]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Ringkasan Privasi</p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#172033]">Ringkas dan jelas</h2>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {privacyHighlights.map(({ label, desc, Icon }) => (
                  <div key={label} className="flex gap-3 rounded-md border border-[#dbe8f3] bg-[#f8fbff] p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#14b8a6]" />
                    <div>
                      <p className="text-sm font-bold text-[#172033]">{label}</p>
                      <p className="mt-1 text-xs leading-5 text-[#526173]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-md border border-[#dbe8f3] bg-white p-4 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Daftar Isi</p>
                <nav className="mt-4 grid gap-1" aria-label="Daftar isi Kebijakan Privasi">
                  {tableOfContents.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="rounded-md px-3 py-2 text-sm font-semibold text-[#526173] transition-colors hover:bg-[#f8fbff] hover:text-[#172033]"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="grid gap-5">
              {policySections.map(({ id, title, summary, Icon, content }) => (
                <article
                  key={id}
                  id={id}
                  className="scroll-mt-28 rounded-md border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)] sm:p-6"
                >
                  <div className="mb-5 flex items-start gap-4 border-b border-[#dbe8f3] pb-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#fed7aa] bg-[#fff7ed] text-[#f97316]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-normal text-[#172033]">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#64748b]">{summary}</p>
                    </div>
                  </div>
                  <div className="text-sm leading-7 text-[#526173]">{content}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
