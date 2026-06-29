import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";
import { Mail, Phone, MapPin, MessageCircle, ArrowRight } from "lucide-react";

const contacts = [
  {
    href: "mailto:supportmution@gmail.com",
    icon: Mail,
    label: "Email",
    value: "supportmution@gmail.com",
    note: "Respons dalam 1–2 hari kerja",
  },
  {
    href: "https://wa.me/6285709557572",
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+62 857-0955-7572",
    note: "Untuk pertanyaan cepat",
    external: true,
  },
  {
    href: "tel:+6285709557572",
    icon: Phone,
    label: "Telepon",
    value: "+62 857-0955-7572",
    note: "Senin–Jumat, 09.00–17.00 WIB",
  },
];

const cardStyle = { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" };

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <PageHero
        eyebrow="Kontak"
        title={<>Ada pertanyaan? <span className="text-primary">Kami siap membantu.</span></>}
        subtitle="Tim Mution siap merespons pertanyaan, laporan masalah, atau permintaan kerjasama kamu."
      />

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Contact cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {contacts.map(({ href, icon: Icon, label, value, note, external }) => (
              <a
                key={label}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="group flex flex-col gap-4 rounded-xl p-6 transition-all hover:border-primary/30 hover:bg-white/[0.04]"
                style={cardStyle}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.2)" }}
                >
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{note}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Address */}
          <div className="rounded-xl p-6 mb-6" style={cardStyle}>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Alamat</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Jalan Kemang No. 81, Muntang Tapus<br />
                  Prabumulih Barat, Kota Prabumulih<br />
                  Sumatera Selatan, Indonesia 31121
                </p>
              </div>
            </div>
          </div>

          {/* FAQ CTA */}
          <div
            className="rounded-2xl p-10 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 60%)" }}
          >
            <h2 className="text-xl font-bold tracking-tight mb-2 text-white">Cek FAQ dulu</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              Banyak pertanyaan umum sudah terjawab di halaman FAQ kami.
            </p>
            <Link href="/faq">
              <button className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-5 py-2.5 transition-all duration-200" style={{ background: "rgb(249,115,22)", color: "#fff", boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 20px rgba(249,115,22,0.3)" }}>
                Lihat FAQ <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>

        </div>
      </section>

      <PageFooter />
    </div>
  );
}
