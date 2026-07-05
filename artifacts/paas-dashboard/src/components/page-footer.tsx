import { Link } from "wouter";

const footerLinks = [
  { label: "Layanan", href: "/layanan" },
  { label: "Harga", href: "/harga" },
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan Privasi", href: "/privacy-policy" },
  { label: "Ketentuan", href: "/terms-and-conditions" },
  { label: "Kontak", href: "/kontak" },
];

export function PageFooter() {
  return (
    <footer className="border-t py-10" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <img src="/mution-logo.png" alt="Mution" className="h-6 w-auto" />
              <span
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                className="text-sm font-extrabold text-primary"
              >
                Mution
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Pioo (Co-founder & CEO) - Tiara (Co-founder)
            </p>
          </div>

          <a
            href="mailto:supportmution@gmail.com"
            className="text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgb(249,115,22)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            supportmution@gmail.com
          </a>

          <div className="flex flex-col items-center sm:items-end gap-1.5">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              (c) {new Date().getFullYear()} Mution. Dibuat di Indonesia.
            </p>
            <div
              className="flex flex-wrap justify-center sm:justify-end gap-4 text-xs"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              {footerLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
