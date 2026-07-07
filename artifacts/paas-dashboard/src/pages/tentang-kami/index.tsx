import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  CreditCard,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
  Server,
} from "lucide-react";

const buildItems = [
  {
    icon: Server,
    title: "Hosting & deployment",
    desc: "Deploy aplikasi dari runtime populer, sambungkan domain, dan pantau resource dari dashboard yang sama.",
  },
  {
    icon: KeyRound,
    title: "AI API gateway",
    desc: "Kelola API key dan akses model AI tanpa perlu mengatur banyak provider secara terpisah.",
  },
  {
    icon: CreditCard,
    title: "Billing kredit",
    desc: "Pemakaian hosting dan AI dibuat lebih mudah dibaca lewat sistem kredit yang transparan.",
  },
];

const principles = [
  "Fitur harus jelas manfaatnya.",
  "Harga dan pemakaian harus mudah dipahami.",
  "Dashboard harus tetap sederhana.",
  "Masukan pengguna diprioritaskan.",
];

const contacts = [
  {
    href: "mailto:supportmution@gmail.com",
    icon: Mail,
    label: "Email",
    value: "supportmution@gmail.com",
    note: "Untuk support, kerja sama, dan pertanyaan umum.",
  },
  {
    href: "https://wa.me/6285709557572",
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+62 857-0955-7572",
    note: "Untuk pertanyaan cepat.",
    external: true,
  },
  {
    href: "tel:+6285709557572",
    icon: Phone,
    label: "Telepon",
    value: "+62 857-0955-7572",
    note: "Senin-Jumat, 09.00-17.00 WIB.",
  },
];

export default function TentangKamiPage() {
  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033]">
      <PublicNavbar />

      <main>
        <section className="px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Tentang Mution</p>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#172033] sm:text-5xl lg:text-6xl">
                  Platform untuk deploy aplikasi dan mengelola akses AI dalam satu dashboard.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                  Mution membantu developer menjalankan aplikasi, memantau pemakaian, mengelola kredit, dan menggunakan model AI tanpa perlu berpindah-pindah layanan.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/register">
                    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]">
                      Mulai Bangun
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                  <a
                    href="mailto:supportmution@gmail.com"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-[#c9d8e7] bg-white px-5 text-sm font-semibold text-[#172033] transition-colors hover:bg-[#eef8ff]"
                  >
                    Hubungi Kami
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe8f3] bg-white p-2 shadow-[0_24px_70px_rgba(23,32,51,0.08)]">
                <div className="rounded-xl border border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#fff7ed_100%)] p-5">
                  <div className="flex items-center justify-between border-b border-[#dbe8f3] pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Workspace</p>
                      <p className="mt-1 text-sm font-semibold text-[#172033]">Mution dashboard</p>
                    </div>
                    <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16a34a]">
                      Active
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      { label: "Projects", value: "Deploy & runtime", icon: Server },
                      { label: "AI Keys", value: "Model access", icon: KeyRound },
                      { label: "Usage", value: "Credits & resource", icon: BarChart3 },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 rounded-xl border border-[#dbe8f3] bg-white/85 p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#f97316]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#172033]">{label}</p>
                          <p className="mt-0.5 text-xs text-[#526173]">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-[#dbe8f3] bg-[#f8fbff] p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
                      <Cpu className="h-4 w-4 text-[#14b8a6]" />
                      Fokus kami
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#526173]">
                      Membuat alur deploy, akses AI, dan billing terasa lebih ringkas untuk produk kecil sampai tim yang mulai bertumbuh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dbe8f3] bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Kenapa Mution dibuat</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-[#172033]">
                Kebutuhan infra dan AI sering tersebar di banyak tempat.
              </h2>
            </div>
            <div className="space-y-4 text-base leading-8 text-[#526173]">
              <p>
                Mution dibuat dari kebutuhan sederhana: menjalankan aplikasi dan layanan pendukungnya dengan alur yang lebih ringkas.
              </p>
              <p>
                Banyak developer butuh deploy, monitoring, billing, API key, dan akses AI, tapi sering tersebar di beberapa layanan berbeda. Kami ingin Mution menjadi tempat yang lebih rapi untuk kebutuhan itu.
              </p>
              <div className="pt-4">
                <p className="text-sm font-bold text-[#172033]">Pioo (Founder) & Tiara (co-Founder)</p>
                <p className="mt-1 text-sm text-[#526173]">Tim kecil di balik Mution.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Yang sedang kami bangun</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-[#172033]">
                Tiga bagian utama yang dibuat saling terhubung.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {buildItems.map(({ icon: Icon, title, desc }) => (
                <article key={title} className="rounded-2xl border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.06)]">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#f97316]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-extrabold tracking-normal text-[#172033]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#526173]">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#dbe8f3] bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Cara kami mengambil keputusan</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-[#172033]">
                Produk dibuat pelan-pelan, dengan prioritas yang jelas.
              </h2>
              <p className="mt-5 text-sm leading-7 text-[#526173]">
                Kami tidak ingin menambah banyak fitur hanya supaya terlihat lengkap. Fokusnya adalah fitur yang membantu workflow developer jadi lebih singkat dan mudah dipahami.
              </p>
            </div>

            <div className="grid gap-3">
              {principles.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-[#dbe8f3] bg-[#f8fbff] p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#14b8a6]" />
                  <p className="text-sm font-semibold leading-6 text-[#172033]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Hubungi kami</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-[#172033]">
                Untuk pertanyaan, laporan masalah, atau kerja sama.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
              {contacts.map(({ href, icon: Icon, label, value, note, external }) => (
                <a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="group rounded-2xl border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.06)] transition-colors hover:border-[#f97316]/35 hover:bg-[#fff7ed]"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#f97316]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">{label}</p>
                      <p className="mt-2 break-all text-sm font-bold text-[#172033]">{value}</p>
                      <p className="mt-2 text-sm leading-6 text-[#526173]">{note}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
