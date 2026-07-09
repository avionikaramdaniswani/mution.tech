import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  Gift,
  Mail,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";

const refundHighlights: { label: string; desc: string; Icon: LucideIcon }[] = [
  {
    label: "7 hari kalender",
    desc: "Refund dapat diajukan maksimal 7 hari sejak pembelian kredit.",
    Icon: Clock3,
  },
  {
    label: "Kredit belum dipakai",
    desc: "Refund hanya berlaku untuk kredit yang belum pernah digunakan.",
    Icon: WalletCards,
  },
  {
    label: "Akun aktif",
    desc: "Akun tidak sedang dibatasi, suspended, atau diblokir karena pelanggaran.",
    Icon: ShieldCheck,
  },
];

const tableOfContents = [
  { id: "umum", label: "Umum" },
  { id: "belum-digunakan", label: "Kredit belum digunakan" },
  { id: "tidak-dapat-refund", label: "Tidak dapat di-refund" },
  { id: "prosedur", label: "Prosedur pengajuan" },
  { id: "gangguan", label: "Gangguan layanan" },
  { id: "kontak", label: "Kontak" },
];

const refundSections: {
  id: string;
  title: string;
  summary: string;
  Icon: LucideIcon;
  content: ReactNode;
}[] = [
  {
    id: "umum",
    title: "1. Umum",
    summary: "Dasar kebijakan pengembalian dana untuk pembelian kredit.",
    Icon: FileText,
    content: (
      <p>
        Mution berkomitmen untuk memberikan layanan terbaik kepada seluruh pengguna. Kebijakan refund ini menjelaskan kondisi dan prosedur pengembalian dana atas pembelian kredit yang dilakukan di platform Mution (mution.tech).
      </p>
    ),
  },
  {
    id: "belum-digunakan",
    title: "2. Kredit yang Belum Digunakan",
    summary: "Syarat utama agar pembelian kredit dapat diajukan refund.",
    Icon: FileCheck2,
    content: (
      <>
        <p>Pengguna dapat mengajukan refund untuk kredit yang belum digunakan dalam kondisi berikut:</p>
        <div className="mt-4 grid gap-3">
          {[
            "Permintaan refund diajukan dalam 7 hari kalender sejak tanggal pembelian kredit.",
            "Kredit yang diminta refund belum pernah digunakan sama sekali.",
            "Akun pengguna dalam status aktif dan tidak sedang dibatasi karena pelanggaran.",
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
    id: "tidak-dapat-refund",
    title: "3. Kredit yang Tidak Dapat Di-refund",
    summary: "Kondisi yang membuat refund tidak dapat diproses.",
    Icon: AlertCircle,
    content: (
      <>
        <p>Refund tidak dapat diproses untuk:</p>
        <ul className="mt-4 grid gap-2">
          {[
            "Kredit yang sudah digunakan sebagian atau seluruhnya untuk layanan.",
            "Pembelian kredit yang dilakukan lebih dari 7 hari kalender sebelumnya.",
            "Akun yang melanggar Syarat & Ketentuan Mution.",
            "Kredit yang berasal dari program promosi, bonus, hadiah, atau kompensasi.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f97316]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "prosedur",
    title: "4. Prosedur Pengajuan Refund",
    summary: "Informasi yang perlu dikirim agar tim dapat memeriksa pengajuan.",
    Icon: RefreshCw,
    content: (
      <>
        <p>Untuk mengajukan refund, ikuti langkah-langkah berikut:</p>
        <ol className="mt-4 grid gap-3">
          {[
            "Kirim email ke supportmution@gmail.com dengan subjek refund yang jelas.",
            "Sertakan nama lengkap, email akun, tanggal pembelian, jumlah kredit yang dibeli, dan alasan refund.",
            "Tim Mution akan memeriksa pengajuan dan dapat meminta informasi tambahan jika diperlukan.",
            "Jika disetujui, refund akan diproses ke kanal pembayaran yang sesuai dalam estimasi waktu kerja yang wajar.",
          ].map((item, index) => (
            <li key={item} className="flex gap-3 rounded-md border border-[#dbe8f3] bg-[#f8fbff] p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    id: "gangguan",
    title: "5. Gangguan Layanan",
    summary: "Kompensasi dapat diberikan jika gangguan signifikan memenuhi syarat.",
    Icon: CreditCard,
    content: (
      <p>
        Jika terjadi gangguan layanan yang signifikan dan terbukti disebabkan oleh kesalahan di pihak Mution, pengguna dapat berhak mendapatkan kompensasi dalam bentuk kredit tambahan. Besaran kompensasi ditentukan berdasarkan evaluasi durasi, dampak, dan kondisi gangguan.
      </p>
    ),
  },
  {
    id: "kontak",
    title: "6. Kontak",
    summary: "Kanal resmi untuk pertanyaan dan pengajuan refund.",
    Icon: Mail,
    content: (
      <>
        <p>
          Untuk pertanyaan lebih lanjut terkait kebijakan refund, silakan hubungi kami di{" "}
          <a href="mailto:supportmution@gmail.com" className="font-semibold text-[#f97316] hover:underline">
            supportmution@gmail.com
          </a>{" "}
          atau melalui halaman{" "}
          <Link href="/tentang-kami" className="font-semibold text-[#f97316] hover:underline">
            Tentang Kami
          </Link>.
        </p>
        <a
          href="mailto:supportmution@gmail.com"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]"
        >
          Ajukan pertanyaan refund
          <ArrowRight className="h-4 w-4" />
        </a>
      </>
    ),
  },
];

export default function RefundPolicyPage() {
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
                Kebijakan Refund
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                Ketentuan refund untuk pembelian kredit Mution, termasuk kredit yang belum digunakan, kondisi yang tidak bisa di-refund, dan prosedur pengajuan.
              </p>

              <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-[#526173]">
                {["Terakhir diperbarui: Juni 2026", "Maksimal 7 hari", "Kredit belum digunakan"].map((item) => (
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
                  <Gift className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Ringkasan Refund</p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#172033]">Kapan bisa diajukan</h2>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {refundHighlights.map(({ label, desc, Icon }) => (
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
                <nav className="mt-4 grid gap-1" aria-label="Daftar isi Kebijakan Refund">
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
              {refundSections.map(({ id, title, summary, Icon, content }) => (
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
