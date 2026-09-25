import { MessageCircle, Mail, HelpCircle, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function SupportPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-black tracking-tight text-[#172033] dark:text-foreground mb-4">
          Pusat Bantuan
        </h1>
        <p className="text-lg text-[#526173] dark:text-muted-foreground">
          Ada kendala teknis atau pertanyaan seputar Mution? Tim kami selalu siap membantu Anda. Silakan pilih jalur komunikasi di bawah ini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
        {/* WhatsApp Card */}
        <a 
          href="https://wa.me/6283895472636" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group relative flex flex-col p-8 rounded-3xl bg-white border-2 border-[#dbe8f3] hover:border-emerald-500 hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] transition-all duration-300 dark:bg-card dark:border-border overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest dark:bg-emerald-500/20 dark:text-emerald-400">
              Respon Cepat
            </span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
            <MessageCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-[#172033] dark:text-foreground mb-2">WhatsApp</h3>
          <p className="text-sm text-[#526173] dark:text-muted-foreground mb-6 flex-1">
            Chat langsung dengan tim support kami. Cocok untuk kendala mendesak atau konsultasi cepat.
          </p>
          <div className="flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-500 group-hover:gap-2 transition-all">
            Chat Sekarang <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </a>

        {/* Email Card */}
        <a 
          href="mailto:support@mution.tech" 
          className="group flex flex-col p-8 rounded-3xl bg-white border border-[#dbe8f3] hover:border-blue-500 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)] transition-all duration-300 dark:bg-card dark:border-border"
        >
          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
            <Mail className="h-7 w-7 text-blue-600 dark:text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-[#172033] dark:text-foreground mb-2">Email Support</h3>
          <p className="text-sm text-[#526173] dark:text-muted-foreground mb-6 flex-1">
            Kirimkan detail kendala teknis atau pertanyaan bisnis Anda. Kami akan membalas dalam 1x24 jam.
          </p>
          <div className="flex items-center text-sm font-bold text-blue-600 dark:text-blue-500 group-hover:gap-2 transition-all">
            Kirim Email <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </a>

        {/* FAQ Card */}
        <Link href="/faq">
          <div className="group flex flex-col p-8 rounded-3xl bg-white border border-[#dbe8f3] hover:border-orange-500 hover:shadow-[0_8px_30px_rgba(249,115,22,0.12)] transition-all duration-300 dark:bg-card dark:border-border h-full cursor-pointer">
            <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
              <HelpCircle className="h-7 w-7 text-orange-600 dark:text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-[#172033] dark:text-foreground mb-2">FAQ & Panduan</h3>
            <p className="text-sm text-[#526173] dark:text-muted-foreground mb-6 flex-1">
              Temukan jawaban cepat untuk pertanyaan yang sering diajukan seputar layanan Mution.
            </p>
            <div className="flex items-center text-sm font-bold text-orange-600 dark:text-orange-500 group-hover:gap-2 transition-all">
              Baca FAQ <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-[#526173] dark:text-muted-foreground mb-4">
          Ingin belajar cara menggunakan platform kami secara mandiri?
        </p>
        <Link href="/docs">
          <button className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl font-bold border border-[#dbe8f3] bg-white text-[#172033] hover:bg-[#eef8ff] transition-all active:scale-95 dark:bg-transparent dark:border-border dark:text-foreground dark:hover:bg-muted/40">
            <BookOpen className="h-4 w-4 text-primary" /> Buka Dokumentasi
          </button>
        </Link>
      </div>
    </div>
  );
}
