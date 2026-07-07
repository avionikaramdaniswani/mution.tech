import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  KeyRound,
  LifeBuoy,
  MessageCircle,
  Rocket,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const categories = [
  { label: "Semua", value: "Semua", Icon: LifeBuoy },
  { label: "Mulai", value: "Mulai", Icon: Rocket },
  { label: "Deploy", value: "Deploy", Icon: Activity },
  { label: "Billing", value: "Billing", Icon: CreditCard },
  { label: "AI & API", value: "AI & API", Icon: KeyRound },
  { label: "Keamanan", value: "Keamanan", Icon: ShieldCheck },
] as const;

type Category = (typeof categories)[number]["value"];

type FAQEntry = {
  category: Exclude<Category, "Semua">;
  q: string;
  a: string;
};

const faqs: FAQEntry[] = [
  {
    category: "Mulai",
    q: "Apa itu Mution?",
    a: "Mution adalah platform untuk deploy aplikasi, mengelola API key AI, memantau usage, dan mengatur kredit dari satu workspace. Fokusnya supaya kamu bisa jalan cepat tanpa mengurus server manual.",
  },
  {
    category: "Mulai",
    q: "Bagaimana cara mulai menggunakan Mution?",
    a: "Buat akun, buat proyek baru, sambungkan repository GitHub, lalu pilih runtime yang sesuai. Setelah konfigurasi dasar selesai, Mution akan menjalankan proses build dan deploy otomatis.",
  },
  {
    category: "Mulai",
    q: "Apakah perlu kartu kredit untuk mencoba?",
    a: "Tidak perlu. Kamu bisa daftar dan mulai mencoba dari plan gratis. Kredit baru dipakai saat resource berjalan atau saat kamu menggunakan layanan berbasis usage.",
  },
  {
    category: "Deploy",
    q: "Runtime apa saja yang didukung?",
    a: "Mution mendukung Node.js, Python, PHP, Go, Ruby, Java, Rust, Deno, Bun, .NET, dan Docker. Kalau stack kamu punya Dockerfile, biasanya bisa dijalankan sebagai container.",
  },
  {
    category: "Deploy",
    q: "Berapa lama proses deploy biasanya?",
    a: "Untuk aplikasi kecil, proses deploy biasanya selesai dalam hitungan puluhan detik. Build yang lebih besar atau dependency yang berat bisa membutuhkan waktu lebih lama.",
  },
  {
    category: "Deploy",
    q: "Apakah bisa pakai domain sendiri?",
    a: "Bisa. Kamu dapat menghubungkan custom domain ke proyek dan mengaktifkan HTTPS tanpa konfigurasi server manual.",
  },
  {
    category: "Deploy",
    q: "Bisakah rollback ke versi sebelumnya?",
    a: "Bisa. Riwayat deployment disimpan supaya kamu dapat kembali ke versi yang stabil saat rilis terbaru bermasalah.",
  },
  {
    category: "Deploy",
    q: "Database apa yang tersedia?",
    a: "Mution menyediakan managed PostgreSQL per proyek. Provisioning dibuat ringkas supaya database bisa langsung dipakai oleh aplikasi yang sedang kamu deploy.",
  },
  {
    category: "Billing",
    q: "Bagaimana cara kerja sistem kredit?",
    a: "Kredit adalah saldo usage. Saat resource hosting, database, atau API digunakan, kredit akan berkurang sesuai pemakaian. Kamu bisa memantau sisa kredit dari dashboard.",
  },
  {
    category: "Billing",
    q: "Apakah ada biaya tersembunyi?",
    a: "Tidak ada biaya setup atau biaya tersembunyi. Biaya mengikuti plan dan resource yang kamu gunakan, sehingga pengeluaran lebih mudah dipantau.",
  },
  {
    category: "Billing",
    q: "Apa bedanya plan Hobby, Pro, dan Team?",
    a: "Hobby cocok untuk mencoba dan project kecil. Pro memberi kapasitas lebih besar untuk produk aktif. Team ditujukan untuk kolaborasi, shared project, dan kebutuhan tim.",
  },
  {
    category: "AI & API",
    q: "Apakah Mution bisa mengelola API key AI?",
    a: "Bisa. Kamu dapat membuat API key, mengatur akses model, melihat pemakaian token, dan menghubungkan usage AI ke sistem kredit yang sama.",
  },
  {
    category: "AI & API",
    q: "Provider model AI apa saja yang tersedia?",
    a: "Mution menyiapkan katalog model dari beberapa provider yang bisa berubah sesuai ketersediaan platform. Daftar model dan tarif paling aman dicek dari halaman harga atau dashboard provider.",
  },
  {
    category: "Keamanan",
    q: "Apakah data saya aman?",
    a: "Data dikirim melalui koneksi terenkripsi dan akses pengguna dipisahkan berdasarkan akun. Untuk kredensial seperti API key, gunakan secret atau environment variable, bukan hardcode di repository.",
  },
  {
    category: "Keamanan",
    q: "Apakah ada jaminan uptime?",
    a: "Plan berbayar dirancang untuk beban produksi dan monitoring yang lebih serius. Jika kamu butuh komitmen SLA khusus, hubungi tim Mution agar kebutuhanmu bisa dievaluasi.",
  },
  {
    category: "Keamanan",
    q: "Bagaimana jika saya butuh bantuan teknis?",
    a: "Kamu bisa menghubungi support melalui email supportmution@gmail.com atau WhatsApp di +62 857-0955-7572. Sertakan nama proyek, error yang muncul, dan waktu kejadian agar pengecekan lebih cepat.",
  },
];

const quickStats = [
  { label: "Topik bantuan", value: "6 kategori" },
  { label: "Jalur support", value: "Email & WhatsApp" },
  { label: "Cakupan", value: "Deploy, billing, AI" },
];

const supportCards: { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "Deploy & runtime",
    body: "Panduan seputar build, runtime, domain, database, dan rollback.",
    Icon: Rocket,
  },
  {
    title: "Billing transparan",
    body: "Jawaban tentang kredit, plan, dan cara membaca pemakaian resource.",
    Icon: CreditCard,
  },
  {
    title: "API key AI",
    body: "Kontrol akses model, usage token, dan integrasi gateway AI.",
    Icon: KeyRound,
  },
];

function getCategoryIcon(category: FAQEntry["category"]) {
  return categories.find((item) => item.value === category)?.Icon ?? LifeBuoy;
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("Semua");
  const [query, setQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "Semua" || faq.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${faq.q} ${faq.a} ${faq.category}`.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033]">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#dbe8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_56%,#fff7ed_100%)] px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,0.08),rgba(20,184,166,0.09)_42%,transparent_72%)]" />

          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
                Pusat Bantuan Mution
              </p>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-normal text-[#172033] sm:text-6xl">
                Jawaban cepat untuk deploy, kredit, dan API key.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                Cari topik yang kamu butuhkan, mulai dari setup proyek pertama sampai penggunaan model AI dan pengelolaan billing.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[#dbe8f3] bg-white/80 p-4 shadow-[0_18px_45px_rgba(23,32,51,0.07)] backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">{stat.label}</p>
                    <p className="mt-2 text-lg font-extrabold text-[#172033]">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-[2rem] border border-[#dbe8f3] bg-white/90 p-2 shadow-[0_24px_70px_rgba(23,32,51,0.10)] backdrop-blur">
              <div className="rounded-[1.5rem] border border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#eefdfa_52%,#fff7ed_100%)] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#fed7aa] bg-white text-[#f97316] shadow-[0_14px_34px_rgba(249,115,22,0.16)]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-normal text-[#172033]">
                  Butuh jawaban langsung?
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#526173]">
                  Tim Mution bisa bantu cek kendala teknis, billing, atau setup proyek yang belum terjawab di FAQ.
                </p>

                <div className="mt-6 space-y-3 text-sm">
                  <a
                    href="mailto:supportmution@gmail.com"
                    className="flex items-center justify-between rounded-2xl border border-[#dbe8f3] bg-white px-4 py-3 font-semibold text-[#172033] transition-colors hover:border-[#f97316]/40 hover:bg-[#fff7ed]"
                  >
                    supportmution@gmail.com
                    <ArrowRight className="h-4 w-4 text-[#f97316]" />
                  </a>
                  <a
                    href="https://wa.me/6285709557572"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-[#dbe8f3] bg-white px-4 py-3 font-semibold text-[#172033] transition-colors hover:border-[#14b8a6]/40 hover:bg-[#eefdfa]"
                  >
                    WhatsApp support
                    <ArrowRight className="h-4 w-4 text-[#14b8a6]" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-[#f8fbff] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
              <aside className="lg:sticky lg:top-24">
                <div className="rounded-[2rem] border border-[#dbe8f3] bg-white p-4 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari pertanyaan..."
                      className="h-11 rounded-2xl border-[#dbe8f3] bg-[#f8fbff] pl-10 pr-10 text-sm shadow-none focus-visible:ring-[#f97316]"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Hapus pencarian"
                        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#64748b] transition-colors hover:bg-white hover:text-[#172033]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-5 space-y-2">
                    {categories.map(({ label, value, Icon }) => {
                      const active = activeCategory === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setActiveCategory(value)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-bold transition-all ${
                            active
                              ? "border-[#fdba74] bg-[#fff7ed] text-[#f97316] shadow-[0_12px_28px_rgba(249,115,22,0.12)]"
                              : "border-transparent text-[#526173] hover:border-[#dbe8f3] hover:bg-[#f8fbff] hover:text-[#172033]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{label}</span>
                          </span>
                          <span className="text-xs font-extrabold">
                            {value === "Semua" ? faqs.length : faqs.filter((faq) => faq.category === value).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 hidden space-y-3 lg:block">
                  {supportCards.map(({ title, body, Icon }) => (
                    <div key={title} className="rounded-2xl border border-[#dbe8f3] bg-white/80 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eefdfa] text-[#14b8a6]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-[#172033]">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#64748b]">{body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <div>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
                      {filteredFaqs.length} jawaban ditemukan
                    </p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033]">
                      Pertanyaan populer
                    </h2>
                  </div>
                  <Link
                    href="/harga"
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-[#c9d8e7] bg-white px-4 text-sm font-semibold text-[#172033] transition-colors hover:bg-[#eef8ff]"
                  >
                    Lihat Harga
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {filteredFaqs.length > 0 ? (
                  <Accordion type="single" collapsible className="columns-1 gap-4 md:columns-2">
                    {filteredFaqs.map((faq, index) => {
                      const Icon = getCategoryIcon(faq.category);

                      return (
                        <AccordionItem
                          key={faq.q}
                          value={`${faq.category}-${index}`}
                          className="mb-4 break-inside-avoid overflow-hidden rounded-[1.5rem] border border-[#dbe8f3] bg-white shadow-[0_18px_50px_rgba(23,32,51,0.07)] transition-all data-[state=open]:border-[#f97316]/35 data-[state=open]:bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_58%,#eefdfa_100%)] data-[state=open]:shadow-[0_24px_70px_rgba(23,32,51,0.11)]"
                        >
                          <AccordionTrigger className="gap-4 px-5 py-5 text-left text-sm font-extrabold leading-6 text-[#172033] hover:no-underline [&>svg]:mt-1 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-[#64748b]">
                            <span className="flex min-w-0 items-start gap-3">
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dbe8f3] bg-[#f8fbff] text-[#f97316]">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span>
                                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                                  {faq.category}
                                </span>
                                {faq.q}
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-[#dbe8f3] px-5 pb-5 pt-4 text-sm leading-7 text-[#526173]">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="rounded-[2rem] border border-[#dbe8f3] bg-white p-8 text-center shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#f97316]">
                      <Search className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold text-[#172033]">Belum ada jawaban yang cocok</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#526173]">
                      Coba kata kunci lain atau hubungi support supaya tim Mution bisa bantu cek kasusmu langsung.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveCategory("Semua");
                      }}
                      className="mt-6 bg-[#172033] text-white hover:bg-[#263247]"
                    >
                      Reset filter
                    </Button>
                  </div>
                )}

                <div className="mt-10 rounded-[2rem] border border-[#dbe8f3] bg-white p-6 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                  <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
                        Masih butuh bantuan?
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-normal text-[#172033]">
                        Kirim detail kendala supaya kami bisa bantu lebih cepat.
                      </h2>
                      <div className="mt-4 grid gap-2 text-sm text-[#526173] sm:grid-cols-3">
                        {["Nama proyek", "Log error", "Waktu kejadian"].map((item) => (
                          <span key={item} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#14b8a6]" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                      <a
                        href="mailto:supportmution@gmail.com"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f97316] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]"
                      >
                        Email Support
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <Link
                        href="/tentang-kami"
                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c9d8e7] bg-white px-4 text-sm font-semibold text-[#172033] transition-colors hover:bg-[#eef8ff]"
                      >
                        Tentang Kami
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
