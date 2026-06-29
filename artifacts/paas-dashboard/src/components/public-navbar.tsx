import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, ChevronDown } from "lucide-react";

const kebijakanLinks = [
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan Privasi", href: "/privacy-policy" },
  { label: "Ketentuan Layanan", href: "/terms-and-conditions" },
  { label: "Kebijakan Refund", href: "/refund-policy" },
];

const mainLinks = [
  { label: "Fitur", href: "/#fitur" },
  { label: "Harga", href: "/harga" },
  { label: "Kontak", href: "/kontak" },
];

export function PublicNavbar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isKebijakanActive = kebijakanLinks.some((l) => location === l.href);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/mution-logo.png" alt="Mution" className="h-9 w-auto" />
            <span
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              className="text-xl font-extrabold text-primary tracking-tight"
            >
              Mution
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location === link.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Kebijakan dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  isKebijakanActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                Kebijakan
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform duration-200"
                  style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1.5 w-52 rounded-xl border border-border/60 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden"
                  style={{ zIndex: 100 }}
                >
                  {kebijakanLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setDropdownOpen(false)}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        location === link.href
                          ? "text-foreground bg-muted/40 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">
                  Buka Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Masuk</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Daftar Gratis</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-1">

            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  location === link.href
                    ? "bg-muted/40 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-1 pt-2 border-t border-border/30">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Kebijakan
              </p>
              {kebijakanLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    location === link.href
                      ? "bg-muted/40 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-2">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full justify-center">
                    Buka Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full justify-center">Daftar Gratis</Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full justify-center">Masuk</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
