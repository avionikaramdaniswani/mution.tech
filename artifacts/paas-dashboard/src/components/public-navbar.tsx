import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Pricing", href: "/harga" },
  { label: "FAQ", href: "/faq" },
  { label: "About", href: "/tentang-kami" },
];

export function PublicNavbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);

  useEffect(() => {
    const updateNav = () => setNavExpanded(window.scrollY > 96);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  const showFullNav = navExpanded || mobileOpen;

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 text-[#172033] sm:top-5">
      <div
        className={`mx-auto flex h-14 w-full items-center justify-between rounded-full border border-[#dbe8f3] bg-white/88 px-3 shadow-[0_18px_60px_rgba(23,32,51,0.12)] backdrop-blur-xl transition-[max-width,padding,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-16 ${
          showFullNav ? "sm:px-5" : "sm:px-4"
        }`}
        style={{ maxWidth: showFullNav ? "64rem" : "21rem" }}
      >
        <a href="/" className="flex items-center gap-2.5">
          <img src="/mution-logo.png" alt="Mution" className="h-8 w-auto sm:h-9" />
          <span className="text-lg font-extrabold tracking-normal text-[#172033] sm:text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Mution
          </span>
        </a>

        <nav
          className={`hidden items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex ${
            showFullNav ? "max-w-md opacity-100" : "pointer-events-none max-w-0 opacity-0"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#526173] transition-colors hover:bg-[#eef8ff] hover:text-[#172033]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link href="/dashboard">
              <Button className="gap-2 rounded-full bg-[#172033] text-white hover:bg-[#263247]">
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <span
                className={`inline-flex overflow-hidden transition-[max-width,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  showFullNav ? "max-w-24 opacity-100" : "pointer-events-none max-w-0 opacity-0"
                }`}
              >
                <Link href="/login">
                  <Button variant="ghost" className="shrink-0 rounded-full text-[#526173] hover:bg-[#eef8ff] hover:text-[#172033]">
                    Log in
                  </Button>
                </Link>
              </span>
              <Link href="/register">
                <Button className="gap-2 rounded-full bg-[#f97316] text-white hover:bg-[#ea580c]">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#526173] transition-colors hover:bg-[#eef8ff] hover:text-[#172033] md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-5xl rounded-3xl border border-[#dbe8f3] bg-white/95 p-3 shadow-[0_18px_60px_rgba(23,32,51,0.14)] backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-3 py-2.5 text-sm font-medium text-[#526173] hover:bg-[#eef8ff] hover:text-[#172033]"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#dbe8f3] pt-3">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="col-span-2">
                  <Button className="w-full rounded-full bg-[#172033] text-white hover:bg-[#263247]">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full border-[#c9d8e7] bg-white text-[#172033] hover:bg-[#eef8ff]">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full rounded-full bg-[#f97316] text-white hover:bg-[#ea580c]">Get Started</Button>
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
