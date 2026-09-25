import { MessageCircle, Mail, HelpCircle, ArrowRight, BookOpen, Phone, MapPin } from "lucide-react";
import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033]">
      <PublicNavbar />

      <main>
        <section className="px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Support</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-[#172033] mb-4">
              Pusat Bantuan
            </h1>
            <p className="text-lg text-[#526173]">
              Ada kendala teknis atau pertanyaan seputar Mution? Tim kami selalu siap membantu Anda. Silakan pilih jalur komunikasi di bawah ini.
            </p>
          </div>

          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Top row: 3 cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Email Card - 2 emails combined */}
              <a
                href="mailto:support@mution.tech"
                className="group flex flex-col p-8 rounded-3xl bg-white border border-[#dbe8f3] hover:border-blue-500 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)] transition-all duration-300"
              >
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <Mail className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-[#172033] mb-3">Email Support</h3>
                <div className="space-y-2 mb-6 flex-1">
                  <p className="text-sm font-bold text-[#172033]">support@mution.tech</p>
                  <p className="text-sm font-bold text-[#172033]">supportmution@gmail.com</p>
                  <p className="text-sm text-[#526173] mt-2">
                    Kirimkan detail kendala teknis atau pertanyaan bisnis Anda. Kami akan membalas dalam 1x24 jam.
                  </p>
                </div>
                <div className="flex items-center text-sm font-bold text-blue-600 group-hover:gap-2 transition-all">
                  Kirim Email <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </a>

              {/* WhatsApp & Telepon Card - combined */}
              <a
                href="https://wa.me/6283895472636"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col p-8 rounded-3xl bg-white border-2 border-[#dbe8f3] hover:border-emerald-500 hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    Respon Cepat
                  </span>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <MessageCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-[#172033] mb-3">WhatsApp & Telepon</h3>
                <div className="space-y-2 mb-6 flex-1">
                  <p className="text-sm font-bold text-[#172033]">+62 838-9547-2636</p>
                  <p className="text-sm text-[#526173]">
                    Chat langsung atau telepon tim support kami. Cocok untuk kendala mendesak atau konsultasi cepat.
                  </p>
                  <p className="text-xs text-[#526173]">Senin-Jumat, 09.00-17.00 WIB.</p>
                </div>
                <div className="flex items-center text-sm font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  Chat Sekarang <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </a>

              {/* FAQ Card */}
              <Link href="/faq">
                <div className="group flex flex-col p-8 rounded-3xl bg-white border border-[#dbe8f3] hover:border-orange-500 hover:shadow-[0_8px_30px_rgba(249,115,22,0.12)] transition-all duration-300 h-full cursor-pointer">
                  <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
                    <HelpCircle className="h-7 w-7 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-[#172033] mb-3">FAQ & Panduan</h3>
                  <p className="text-sm text-[#526173] mb-6 flex-1">
                    Temukan jawaban cepat untuk pertanyaan yang sering diajukan seputar layanan Mution.
                  </p>
                  <div className="flex items-center text-sm font-bold text-orange-600 group-hover:gap-2 transition-all">
                    Baca FAQ <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Bottom row: wide office address card */}
            <a
              href="https://maps.google.com/?q=Jalan+Kemang+No+81+Prabumulih"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row items-start gap-6 p-8 rounded-3xl bg-white border border-[#dbe8f3] hover:border-[#f97316]/40 hover:shadow-[0_8px_30px_rgba(249,115,22,0.08)] transition-all duration-300"
            >
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center">
                <MapPin className="h-7 w-7 text-[#f97316]" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316] mb-2">Alamat Kantor</p>
                <p className="text-base font-bold text-[#172033] leading-relaxed">
                  Jl. Kemang No. 81, Kel. Muntang Tapus, Kec. Prabumulih Barat, Kota Prabumulih, Sumatera Selatan, Indonesia 31121
                </p>
                <p className="mt-2 text-sm text-[#526173]">Kantor pusat Mution.</p>
              </div>
              <div className="flex items-center text-sm font-bold text-[#f97316] group-hover:gap-2 transition-all shrink-0 self-center">
                Lihat di Maps <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </a>
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm text-[#526173] mb-4">
              Ingin belajar cara menggunakan platform kami secara mandiri?
            </p>
            <Link href="/docs">
              <button className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl font-bold border border-[#dbe8f3] bg-white text-[#172033] hover:bg-[#eef8ff] transition-all active:scale-95">
                <BookOpen className="h-4 w-4 text-[#f97316]" /> Buka Dokumentasi
              </button>
            </Link>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
