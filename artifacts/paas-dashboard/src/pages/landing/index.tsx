import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PublicNavbar } from "@/components/public-navbar";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Cloud,
  GitBranch,
  KeyRound,
} from "lucide-react";
import {
  SiBun,
  SiDeno,
  SiDocker,
  SiDotnet,
  SiGo,
  SiNodedotjs,
  SiPhp,
  SiPython,
  SiRuby,
  SiRust,
  SiInstagram,
  SiTiktok,
  SiWhatsapp,
} from "react-icons/si";
import { FaJava } from "react-icons/fa";

const runtimes = [
  { label: "Node.js", Icon: SiNodedotjs, color: "#5fa04e" },
  { label: "Python", Icon: SiPython, color: "#3776ab" },
  { label: "PHP", Icon: SiPhp, color: "#777bb4" },
  { label: "Go", Icon: SiGo, color: "#00add8" },
  { label: "Ruby", Icon: SiRuby, color: "#cc342d" },
  { label: "Java", Icon: FaJava, color: "#ed8b00" },
  { label: "Rust", Icon: SiRust, color: "#ce422b" },
  { label: "Deno", Icon: SiDeno, color: "#111827" },
  { label: "Bun", Icon: SiBun, color: "#6f4e37" },
  { label: ".NET", Icon: SiDotnet, color: "#512bd4" },
  { label: "Docker", Icon: SiDocker, color: "#2496ed" },
];

interface CreditPackage {
  id: number;
  name: string;
  description: string | null;
  priceIdr: number;
  creditsAmount: number;
  bonusLabel: string | null;
  sortOrder: number;
}

const FALLBACK_PACKAGES: CreditPackage[] = [
  { id: 1, name: "Starter", description: null, priceIdr: 25000, creditsAmount: 28000, bonusLabel: "+12% bonus", sortOrder: 1 },
  { id: 2, name: "Growth", description: null, priceIdr: 75000, creditsAmount: 90000, bonusLabel: "+20% bonus", sortOrder: 2 },
  { id: 3, name: "Scale", description: null, priceIdr: 200000, creditsAmount: 260000, bonusLabel: "+30% bonus", sortOrder: 3 },
];

const faqs = [
  {
    q: "Mution cocok untuk siapa?",
    a: "Mution cocok untuk developer, founder, dan tim produk yang ingin menjalankan app, API, domain, database, serta monitoring tanpa banyak dashboard terpisah.",
  },
  {
    q: "Apakah Mution cuma untuk deploy aplikasi?",
    a: "Tidak. Deploy adalah salah satu bagian saja. Mution juga mengelola API key, usage, kredit, domain, database, provider model, dan monitoring produk.",
  },
  {
    q: "Apakah bisa dipakai untuk project kecil?",
    a: "Bisa. Kamu bisa mulai dari satu app kecil, lalu menambah domain, database, API, dan resource lain saat produk berkembang.",
  },
  {
    q: "Apakah perlu kartu kredit untuk mulai?",
    a: "Tidak perlu. Kamu bisa membuat akun dan mulai mencoba workspace Mution lebih dulu.",
  },
];

const footerLinks = [
  { label: "FAQ", href: "/faq" },
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-and-conditions" },
  { label: "Refund", href: "/refund-policy" },
];

const socialLinks = [
  { label: "WhatsApp", href: "https://wa.me/6285709557572", Icon: SiWhatsapp },
  { label: "Instagram", href: "https://www.instagram.com/mution.tech", Icon: SiInstagram },
  { label: "TikTok", href: "https://www.tiktok.com/@mution.tech", Icon: SiTiktok },
];

const HERO_VIDEO_SRC = "/herobg.mp4?v=20260707";
const HERO_VIDEO_CROSSFADE_MS = 900;

function HeroBackgroundVideo() {
  const firstVideoRef = useRef<HTMLVideoElement>(null);
  const secondVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = useRef(0);
  const isCrossfadingRef = useRef(false);
  const [activeVideo, setActiveVideo] = useState(0);

  useEffect(() => {
    activeVideoRef.current = activeVideo;
  }, [activeVideo]);

  useEffect(() => {
    const videos = [firstVideoRef.current, secondVideoRef.current];
    if (!videos[0] || !videos[1]) return;

    let animationFrame = 0;
    const timeoutIds: number[] = [];

    const crossfadeToStart = () => {
      if (isCrossfadingRef.current) return;

      const currentIndex = activeVideoRef.current;
      const nextIndex = currentIndex === 0 ? 1 : 0;
      const currentVideo = videos[currentIndex];
      const nextVideo = videos[nextIndex];
      if (!currentVideo || !nextVideo) return;

      isCrossfadingRef.current = true;
      nextVideo.currentTime = 0;
      void nextVideo.play().catch(() => undefined);
      activeVideoRef.current = nextIndex;
      setActiveVideo(nextIndex);

      const timeoutId = window.setTimeout(() => {
        currentVideo.pause();
        currentVideo.currentTime = 0;
        isCrossfadingRef.current = false;
      }, HERO_VIDEO_CROSSFADE_MS);
      timeoutIds.push(timeoutId);
    };

    const tick = () => {
      const currentVideo = videos[activeVideoRef.current];
      if (currentVideo) {
        const { currentTime, duration } = currentVideo;
        const leadTime = Math.min(0.9, Math.max(0.35, duration * 0.16));

        if (Number.isFinite(duration) && duration > 1 && currentTime >= duration - leadTime) {
          crossfadeToStart();
        }
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleEnded = () => crossfadeToStart();

    videos.forEach((video) => video?.addEventListener("ended", handleEnded));
    void videos[0].play().catch(() => undefined);
    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      videos.forEach((video) => video?.removeEventListener("ended", handleEnded));
    };
  }, []);

  return (
    <>
      {[firstVideoRef, secondVideoRef].map((videoRef, index) => (
        <video
          key={index}
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-linear ${
            activeVideo === index ? "opacity-100" : "opacity-0"
          }`}
          src={HERO_VIDEO_SRC}
          autoPlay={index === 0}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      ))}
    </>
  );
}

function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f8fbff] text-[#172033]" style={{ minHeight: "100svh" }}>
      <HeroBackgroundVideo />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,251,255,0.78)_0%,rgba(248,251,255,0.48)_42%,rgba(248,251,255,0.12)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_54%,rgba(248,251,255,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_36%,rgba(255,255,255,0.34),transparent_34%)]" />
      <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(135deg,rgba(249,115,22,0.09),rgba(20,184,166,0.06)_46%,transparent_70%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-14 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
            PaaS dan AI gateway untuk produk digital
          </p>
          <h1 className="mt-5 text-5xl font-black leading-[0.94] tracking-normal text-[#172033] sm:text-7xl lg:text-8xl">
            Mution
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
            Deploy aplikasi, kelola API key, pantau pemakaian kredit, dan jalankan operasional produk dari satu workspace yang terasa ringan.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button className="h-11 gap-2 rounded-md bg-[#f97316] px-5 text-white hover:bg-[#ea580c]">
                Mulai Bangun
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-col gap-2 text-sm font-medium text-[#526173] sm:flex-row sm:flex-wrap sm:gap-x-5">
            {["Domain dan SSL siap", "Runtime multi-bahasa", "Usage API terbaca"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#14b8a6]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RuntimeStrip() {
  return (
    <div className="relative overflow-hidden border-y border-[#dbe8f3] bg-white py-7">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-[linear-gradient(to_right,#ffffff,transparent)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-[linear-gradient(to_left,#ffffff,transparent)]" />
      <div className="flex w-max animate-[cityMarquee_30s_linear_infinite]">
        {[0, 1, 2, 3].map((group) => (
          <div key={group} className="flex shrink-0 gap-3 pr-3" aria-hidden={group > 0}>
            {runtimes.map(({ label, Icon, color }) => (
              <div key={`${group}-${label}`} className="flex h-11 items-center gap-2 rounded-xl border border-[#dbe8f3] bg-[#f8fbff] px-4 text-sm font-semibold text-[#172033]">
                <Icon className="h-4 w-4" style={{ color }} />
                {label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesShowcase() {
  return (
    <section className="bg-[#f8fbff] pb-8 pt-16 sm:pb-10 sm:pt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 ml-auto max-w-2xl text-right">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Layanan Mution</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-[#172033] sm:text-4xl">
            Deploy aplikasi dan gateway AI dalam satu alur.
          </h2>
        </div>

        <div className="grid gap-8 border-y border-[#dbe8f3] py-10 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:gap-10 md:py-12">
          <article className="max-w-md">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#bae6fd] bg-white text-[#0ea5e9] shadow-[0_14px_34px_rgba(14,165,233,0.16)]">
                <Cloud className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0ea5e9]">Hosting</p>
                <h3 className="text-2xl font-extrabold tracking-normal text-[#172033]">Deploy & Hosting</h3>
              </div>
            </div>
            <p className="text-sm leading-7 text-[#526173]">
              Jalankan app dari runtime favorit, sambungkan domain, dan pantau resource tanpa pindah-pindah dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { label: "Git push", Icon: GitBranch },
                { label: "Runtime", Icon: Cloud },
                { label: "Monitoring", Icon: Activity },
              ].map(({ label, Icon }) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-[#dbe8f3] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#526173] shadow-sm">
                  <Icon className="h-3.5 w-3.5 text-[#14b8a6]" />
                  {label}
                </span>
              ))}
            </div>
          </article>

          <div className="h-px bg-[#dbe8f3] md:h-auto md:w-px" aria-hidden="true" />

          <article className="max-w-md md:justify-self-end md:text-right">
            <div className="mb-5 flex items-center gap-3 md:justify-end">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#fed7aa] bg-white text-[#f97316] shadow-[0_14px_34px_rgba(249,115,22,0.18)] md:order-2">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">AI Gateway</p>
                <h3 className="text-2xl font-extrabold tracking-normal text-[#172033]">API Keys & Usage</h3>
              </div>
            </div>
            <p className="text-sm leading-7 text-[#526173]">
              Kelola akses model AI, pantau pemakaian token, dan kontrol kredit dari jalur billing yang jelas.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 md:justify-end">
              {[
                { label: "API keys", Icon: KeyRound },
                { label: "Token usage", Icon: Activity },
                { label: "Credits", Icon: Brain },
              ].map(({ label, Icon }) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#526173] shadow-sm">
                  <Icon className="h-3.5 w-3.5 text-[#f97316]" />
                  {label}
                </span>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);

  useEffect(() => {
    fetch("/api/packages")
      .then(r => r.json())
      .then((data: CreditPackage[]) => {
        if (Array.isArray(data) && data.length > 0) setPackages(data);
        else setPackages(FALLBACK_PACKAGES);
      })
      .catch(() => setPackages(FALLBACK_PACKAGES));
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033]">
      <PublicNavbar />

      <main>
        <LandingHero />
        <RuntimeStrip />
        <ServicesShowcase />

        <section className="bg-[#f8fbff] pb-8 pt-8 sm:pb-10 sm:pt-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Paket Kredit</p>
                <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-normal text-[#172033] sm:text-4xl">
                  Bayar sekali, pakai kapan mau. Makin besar, makin hemat.
                </h2>
                <p className="mt-3 text-sm text-[#526173]">
                  Tidak ada langganan bulanan. Kredit kamu pakai sendiri untuk hosting, AI, dan semua layanan Mution.
                </p>
              </div>
              <Link href="/harga">
                <Button variant="outline" className="w-fit rounded-md border-[#c9d8e7] bg-white text-[#172033] hover:bg-[#eef8ff]">
                  Detail Harga
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Gratis signup callout */}
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#14b8a6]/30 bg-[#eefdf9] px-5 py-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#14b8a6]" />
              <div>
                <p className="text-sm font-bold text-[#172033]">Mulai gratis — dapat 5.000 kredit saat daftar</p>
                <p className="text-xs text-[#526173]">Cukup untuk coba deploy aplikasi kecil dan pakai AI API. Topup kapan saja saat siap.</p>
              </div>
              <Link href="/register" className="ml-auto shrink-0">
                <Button size="sm" className="rounded-full bg-[#14b8a6] text-white hover:bg-[#0d9488]">
                  Daftar Gratis
                </Button>
              </Link>
            </div>

            <div className={`grid gap-4 ${packages.length === 2 ? "lg:grid-cols-2" : packages.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-1 max-w-sm"}`}>
              {packages.map((pkg, idx) => {
                const isMiddle = packages.length >= 3 && idx === Math.floor(packages.length / 2);
                const bonusPct = pkg.creditsAmount > pkg.priceIdr
                  ? Math.round(((pkg.creditsAmount - pkg.priceIdr) / pkg.priceIdr) * 100)
                  : null;
                const bonusText = pkg.bonusLabel ?? (bonusPct ? `+${bonusPct}% bonus` : null);

                return (
                  <article
                    key={pkg.id}
                    className={`relative overflow-hidden rounded-[2rem] border p-2 shadow-[0_24px_70px_rgba(23,32,51,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(23,32,51,0.12)] ${
                      isMiddle
                        ? "border-[#f97316]/45 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_72%)]"
                        : "border-[#dbe8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
                    }`}
                  >
                    <div className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${
                      isMiddle
                        ? "border-[#fdba74] bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_54%,#e6fffb_100%)] shadow-[0_18px_50px_rgba(249,115,22,0.16)]"
                        : "border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_62%,#eef8ff_100%)] shadow-[0_18px_50px_rgba(23,32,51,0.08)]"
                    }`}>
                      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#14b8a6]/10 blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-[#f97316]/10 blur-2xl" />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">{pkg.name}</p>
                            <div className="mt-4 flex items-end gap-2">
                              <span className="text-4xl font-black tracking-normal text-[#172033]">
                                Rp {pkg.priceIdr.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[#526173]">sekali bayar</p>
                          </div>
                          {isMiddle && (
                            <div className="rounded-full bg-[#f97316] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]">
                              Populer
                            </div>
                          )}
                          {!isMiddle && bonusText && (
                            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600">
                              {bonusText}
                            </div>
                          )}
                        </div>

                        <div className="mt-5 border-t border-[#dbe8f3]/80 pt-4">
                          <p className="text-sm font-bold text-[#172033]">
                            {pkg.creditsAmount.toLocaleString("id-ID")} kredit
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#526173]">
                            {pkg.description ?? (bonusText ? `${bonusText} dari harga bayar` : "langsung masuk ke saldo")}
                          </p>
                        </div>

                        <Link href="/register" className="mt-5 block">
                          <Button className={`w-full rounded-full ${
                            isMiddle
                              ? "bg-[#f97316] text-white shadow-[0_14px_30px_rgba(249,115,22,0.25)] hover:bg-[#ea580c]"
                              : "bg-[#172033] text-white hover:bg-[#263247]"
                          }`}>
                            Topup Sekarang
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="px-4 pb-5 pt-5">
                      <p className="flex items-center gap-2 text-sm text-[#526173]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10b981]" />
                        Kredit tidak kadaluarsa
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-[#526173]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10b981]" />
                        Untuk hosting, AI API, dan semua layanan Mution
                      </p>
                      {bonusText && isMiddle && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-[#526173]">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10b981]" />
                          {bonusText} dari harga bayar
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#f8fbff] pb-18 pt-6 sm:pb-20 sm:pt-8">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">FAQ</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-normal text-[#172033]">Yang sering ditanyakan</h2>
            </div>
            <div className="columns-1 gap-4 md:columns-2">
              {faqs.map((faq, index) => (
                <article
                  key={faq.q}
                  className={`mb-4 break-inside-avoid overflow-hidden rounded-[1.5rem] border bg-white/90 shadow-[0_18px_50px_rgba(23,32,51,0.07)] transition-all duration-300 ${
                    openFaq === index
                      ? "border-[#f97316]/35 bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_58%,#eefdfa_100%)] shadow-[0_24px_70px_rgba(23,32,51,0.11)]"
                      : "border-[#dbe8f3] hover:border-[#c9d8e7] hover:bg-white"
                  }`}
                >
                  <button
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm font-bold leading-6 text-[#172033]"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    aria-expanded={openFaq === index}
                  >
                    {faq.q}
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        openFaq === index
                          ? "border-[#fdba74] bg-[#fff7ed] text-[#f97316]"
                          : "border-[#dbe8f3] bg-[#f8fbff] text-[#526173]"
                      }`}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      openFaq === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`border-t border-[#dbe8f3] px-5 pb-5 pt-4 text-sm leading-6 text-[#526173] transition-all duration-300 ${
                          openFaq === index ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                        }`}
                      >
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dbe8f3] bg-white py-12 text-[#526173]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <img src="/mution-logo.png" alt="Mution" className="h-8 w-auto" />
                  <span className="text-xl font-extrabold text-[#172033]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Mution
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#526173]">Pioo (Founder) & Tiara (co-Founder)</p>
              </div>

              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold" aria-label="Footer">
                {footerLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="transition-colors hover:text-[#172033]">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#172033]">Follow us</p>
              <div className="mt-3 flex gap-2">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbe8f3] bg-[#f8fbff] text-[#172033] transition-colors hover:border-[#f97316]/40 hover:bg-[#fff7ed] hover:text-[#f97316]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#dbe8f3] pt-6 lg:ml-8 lg:w-72 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#172033]">Call:</p>
                <a href="tel:+6285709557572" className="mt-1 block font-semibold text-[#526173] transition-colors hover:text-[#172033]">
                  +62 857-0955-7572
                </a>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#172033]">Email:</p>
                <a href="mailto:supportmution@gmail.com" className="mt-1 block break-all font-semibold text-[#526173] transition-colors hover:text-[#172033]">
                  supportmution@gmail.com
                </a>
              </div>
            </div>
            <p className="mt-7 text-xs text-[#526173]/75">(c) {new Date().getFullYear()} Mution. Dibuat dengan ❤️.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes cityMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); }
        }
      `}</style>
    </div>
  );
}
