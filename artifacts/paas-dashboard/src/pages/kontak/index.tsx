import { PublicNavbar } from "@/components/public-navbar";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Hubungi Kami</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Ada pertanyaan, masalah, atau butuh bantuan? Tim kami siap membantu kamu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <a
            href="mailto:supportmution@gmail.com"
            className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/80 transition-all"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Email</p>
              <p className="text-sm text-primary">supportmution@gmail.com</p>
              <p className="text-xs text-muted-foreground mt-1">Respons dalam 1–2 hari kerja</p>
            </div>
          </a>

          <a
            href="https://wa.me/6285709557572"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/80 transition-all"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">WhatsApp</p>
              <p className="text-sm text-primary">+62 857-0955-7572</p>
              <p className="text-xs text-muted-foreground mt-1">Untuk pertanyaan cepat</p>
            </div>
          </a>

          <a
            href="tel:+6285709557572"
            className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/80 transition-all"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Telepon</p>
              <p className="text-sm text-primary">+62 857-0955-7572</p>
              <p className="text-xs text-muted-foreground mt-1">Senin–Jumat, 09.00–17.00 WIB</p>
            </div>
          </a>

          <div className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card p-6">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Alamat</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Jalan Kemang No. 81, Muntang Tapus<br />
                Prabumulih Barat, Kota Prabumulih<br />
                Sumatera Selatan, Indonesia 31121
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-border/50 bg-card p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Cek FAQ dulu</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Banyak pertanyaan umum sudah terjawab di halaman FAQ kami.
          </p>
          <a
            href="/faq"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Lihat FAQ
          </a>
        </div>
      </main>
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mution. All rights reserved.
      </footer>
    </div>
  );
}
