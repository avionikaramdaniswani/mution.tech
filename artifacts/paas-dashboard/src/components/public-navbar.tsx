import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Harga", href: "/harga" },
];

export function PublicNavbar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  location === link.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
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
            {navLinks.map((link) => (
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
