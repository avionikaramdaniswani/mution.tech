import { Link } from "wouter";
import { SiInstagram, SiTiktok, SiWhatsapp } from "react-icons/si";

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

export function PageFooter() {
  return (
    <footer className="border-t border-[#dbe8f3] bg-white py-12 text-[#526173]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/mution-logo.png" alt="Mution" className="h-8 w-auto" />
                <span
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="text-xl font-extrabold text-[#172033]"
                >
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#172033]">
              Follow us
            </p>
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
  );
}
