import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Gavel,
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

const termsHighlights: { label: string; desc: string; Icon: LucideIcon }[] = [
  {
    label: "Gunakan layanan secara wajar",
    desc: "Akun dan proyek harus digunakan sesuai hukum dan ketentuan platform.",
    Icon: ShieldCheck,
  },
  {
    label: "Kredit berbasis penggunaan",
    desc: "Biaya mengikuti layanan dan resource yang benar-benar digunakan.",
    Icon: CreditCard,
  },
  {
    label: "Perubahan diberi tahu",
    desc: "Perubahan penting akan diinformasikan lewat kanal resmi Mution.",
    Icon: RefreshCw,
  },
];

const tableOfContents = [
  { id: "penerimaan", label: "Penerimaan syarat" },
  { id: "layanan", label: "Deskripsi layanan" },
  { id: "akun", label: "Akun pengguna" },
  { id: "kredit", label: "Kredit & pembayaran" },
  { id: "larangan", label: "Penggunaan dilarang" },
  { id: "ketersediaan", label: "Ketersediaan layanan" },
  { id: "privasi", label: "Privasi data" },
  { id: "tanggung-jawab", label: "Batas tanggung jawab" },
  { id: "perubahan", label: "Perubahan syarat" },
  { id: "hukum", label: "Hukum berlaku" },
  { id: "kontak", label: "Kontak" },
];

const termsSections: {
  id: string;
  title: string;
  summary: string;
  Icon: LucideIcon;
  content: ReactNode;
}[] = [
  {
    id: "penerimaan",
    title: "1. Penerimaan Syarat",
    summary: "Penggunaan Mution berarti kamu menyetujui ketentuan ini.",
    Icon: FileText,
    content: (
      <p>
        Dengan mendaftar dan menggunakan layanan Mution ("Layanan") yang tersedia di mution.tech, kamu menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat & Ketentuan ini. Jika kamu tidak setuju dengan syarat ini, harap tidak menggunakan Layanan.
      </p>
    ),
  },
  {
    id: "layanan",
    title: "2. Deskripsi Layanan",
    summary: "Ruang lingkup layanan dijelaskan secara umum tanpa membuka detail internal.",
    Icon: Server,
    content: (
      <>
        <p>
          Mution menyediakan platform untuk membantu pengguna menjalankan, mengelola, memantau, dan menghubungkan kebutuhan aplikasi digital dari satu workspace.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "Pengelolaan proyek dan deployment aplikasi.",
            "Pengelolaan konfigurasi dan integrasi pendukung proyek.",
            "Pemantauan penggunaan layanan dan aktivitas terkait.",
            "Sistem kredit, billing, dan akses layanan berbasis penggunaan.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-md border border-[#dbe8f3] bg-[#f8fbff] p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#14b8a6]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "akun",
    title: "3. Akun Pengguna",
    summary: "Pengguna bertanggung jawab menjaga akun dan aksesnya.",
    Icon: UserCheck,
    content: (
      <p>
        Kamu bertanggung jawab penuh atas keamanan akun, kredensial, dan aktivitas yang terjadi melalui akun kamu. Mution tidak bertanggung jawab atas kerugian akibat akses tidak sah yang terjadi karena kelalaian pengguna. Kamu wajib segera memberi tahu kami jika terjadi dugaan pelanggaran keamanan akun.
      </p>
    ),
  },
  {
    id: "kredit",
    title: "4. Sistem Kredit dan Pembayaran",
    summary: "Kredit digunakan untuk layanan berbasis penggunaan.",
    Icon: CreditCard,
    content: (
      <p>
        Layanan Mution menggunakan sistem kredit prabayar. Kredit yang telah dibeli akan dikurangi sesuai penggunaan layanan dan resource yang tersedia di akun. Harga kredit, tarif layanan, dan ketentuan billing dapat berubah sewaktu-waktu dengan pemberitahuan sebelumnya melalui kanal resmi Mution.
      </p>
    ),
  },
  {
    id: "larangan",
    title: "5. Penggunaan yang Dilarang",
    summary: "Aktivitas yang melanggar hukum atau mengganggu layanan tidak diperbolehkan.",
    Icon: AlertTriangle,
    content: (
      <>
        <p>Pengguna dilarang menggunakan Layanan untuk:</p>
        <ul className="mt-4 grid gap-2">
          {[
            "Aktivitas ilegal atau yang melanggar hukum yang berlaku.",
            "Menyebarkan malware, virus, konten berbahaya, atau materi yang merugikan pihak lain.",
            "Melakukan aktivitas yang mengganggu, merusak, atau mencoba mengakses sistem secara tidak sah.",
            "Menjalankan aktivitas komputasi intensif yang tidak wajar tanpa izin tertulis.",
            "Menyimpan atau mendistribusikan konten yang melanggar hak cipta atau hak pihak lain.",
            "Spam, penyalahgunaan layanan, atau aktivitas yang mengganggu pengguna lain.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f97316]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-md border border-[#fed7aa] bg-[#fff7ed] p-4 text-[#7c2d12]">
          Pelanggaran terhadap ketentuan ini dapat mengakibatkan pembatasan, penangguhan, atau penghentian akun tanpa pengembalian dana.
        </p>
      </>
    ),
  },
  {
    id: "ketersediaan",
    title: "6. Ketersediaan Layanan",
    summary: "Mution berupaya menjaga layanan tetap berjalan, dengan batasan wajar.",
    Icon: ShieldCheck,
    content: (
      <p>
        Mution berupaya menjaga ketersediaan layanan secara konsisten, namun tidak menjamin layanan selalu bebas dari gangguan. Pemeliharaan terjadwal, gangguan pihak ketiga, kondisi darurat, atau faktor di luar kendali Mution dapat memengaruhi ketersediaan layanan.
      </p>
    ),
  },
  {
    id: "privasi",
    title: "7. Privasi Data",
    summary: "Penggunaan data mengikuti Kebijakan Privasi Mution.",
    Icon: ShieldCheck,
    content: (
      <p>
        Kami menghormati privasi pengguna. Data yang kamu berikan digunakan untuk keperluan operasional layanan, keamanan, billing, dan peningkatan pengalaman pengguna. Detail lebih lanjut tersedia di Kebijakan Privasi Mution.
      </p>
    ),
  },
  {
    id: "tanggung-jawab",
    title: "8. Batasan Tanggung Jawab",
    summary: "Batas tanggung jawab Mution atas penggunaan layanan.",
    Icon: Scale,
    content: (
      <p>
        Sejauh diperbolehkan oleh hukum, Mution tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan, termasuk kehilangan data, kehilangan keuntungan, atau gangguan operasional.
      </p>
    ),
  },
  {
    id: "perubahan",
    title: "9. Perubahan Syarat",
    summary: "Ketentuan dapat diperbarui sesuai kebutuhan layanan.",
    Icon: RefreshCw,
    content: (
      <p>
        Mution berhak mengubah Syarat & Ketentuan ini kapan saja. Perubahan signifikan akan diinformasikan melalui email, notifikasi platform, atau kanal resmi lain. Penggunaan Layanan setelah perubahan dianggap sebagai penerimaan syarat baru.
      </p>
    ),
  },
  {
    id: "hukum",
    title: "10. Hukum yang Berlaku",
    summary: "Ketentuan tunduk pada hukum yang berlaku di Indonesia.",
    Icon: Gavel,
    content: (
      <p>
        Syarat & Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Negara Republik Indonesia. Setiap sengketa akan diselesaikan terlebih dahulu melalui musyawarah, dan jika tidak berhasil, melalui mekanisme hukum yang berlaku.
      </p>
    ),
  },
  {
    id: "kontak",
    title: "11. Kontak",
    summary: "Kanal resmi untuk pertanyaan terkait ketentuan layanan.",
    Icon: Mail,
    content: (
      <>
        <p>Pertanyaan terkait Syarat & Ketentuan ini dapat dikirimkan ke:</p>
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

export default function TermsPage() {
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
                Syarat & Ketentuan
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                Ketentuan penggunaan Mution, tanggung jawab akun, sistem kredit, dan batasan layanan yang perlu dipahami sebelum menggunakan platform.
              </p>

              <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-[#526173]">
                {["Terakhir diperbarui: Juni 2026", "Berlaku untuk layanan Mution", "Penggunaan wajar"].map((item) => (
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
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Ringkasan Ketentuan</p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#172033]">Aturan dasar layanan</h2>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {termsHighlights.map(({ label, desc, Icon }) => (
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
                <nav className="mt-4 grid gap-1" aria-label="Daftar isi Syarat dan Ketentuan">
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
              {termsSections.map(({ id, title, summary, Icon, content }) => (
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
