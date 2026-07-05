import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Home, LifeBuoy, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import { useAuth } from "@/hooks/use-auth";

const quickLinks = [
  { label: "Pricing", href: "/harga" },
  { label: "Docs", href: "/docs" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/kontak" },
];

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <main className="relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.18), transparent 58%)",
          }}
        />

        <section className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <SearchX className="h-3.5 w-3.5 text-primary" />
                Error 404
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                Halaman ini tidak ditemukan.
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
                Link yang kamu buka mungkin sudah dipindahkan, dihapus, atau alamatnya salah ketik.
                Kamu bisa kembali ke halaman utama atau masuk ke dashboard.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href={user ? "/dashboard" : "/"}>
                    {user ? "Buka Dashboard" : "Kembali ke Beranda"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.28)" }}
            >
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Requested route</p>
                    <p className="mt-1 font-mono text-sm text-foreground break-all">
                      {typeof window !== "undefined" ? window.location.pathname : "/unknown"}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Home className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Coba halaman ini
                  </p>
                  <div className="mt-3 grid gap-2">
                    {quickLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                      >
                        {link.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex gap-3">
                    <LifeBuoy className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Butuh bantuan?</p>
                      <a
                        href="mailto:supportmution@gmail.com"
                        className="mt-1 block text-xs text-muted-foreground hover:text-foreground"
                      >
                        supportmution@gmail.com
                      </a>
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
