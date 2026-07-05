import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      <PageHero
        eyebrow="Legal"
        title="Kebijakan Refund"
        subtitle="Terakhir diperbarui: Juni 2026"
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Umum</h2>
            <p>Mution berkomitmen untuk memberikan layanan terbaik kepada seluruh pengguna. Kebijakan refund ini menjelaskan kondisi dan prosedur pengembalian dana atas pembelian kredit yang dilakukan di platform Mution (mution.tech).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Kredit yang Belum Digunakan</h2>
            <p>Pengguna dapat mengajukan refund untuk kredit yang belum digunakan dalam kondisi berikut:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Permintaan refund diajukan dalam 7 (tujuh) hari kalender sejak tanggal pembelian kredit.</li>
              <li>Kredit yang diminta refund belum pernah digunakan sama sekali.</li>
              <li>Akun pengguna dalam status aktif dan tidak dalam kondisi suspended atau diblokir karena pelanggaran.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Kredit yang Tidak Dapat Di-refund</h2>
            <p>Refund tidak dapat diproses untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Kredit yang sudah digunakan sebagian atau seluruhnya untuk layanan.</li>
              <li>Pembelian kredit yang dilakukan lebih dari 7 hari yang lalu.</li>
              <li>Akun yang melanggar Syarat & Ketentuan Mution.</li>
              <li>Kredit yang diperoleh dari program promosi, bonus, atau hadiah.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Prosedur Pengajuan Refund</h2>
            <p>Untuk mengajukan refund, ikuti langkah-langkah berikut:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-2">
              <li>Kirim email ke <a href="mailto:supportmution@gmail.com" className="text-primary hover:underline">supportmution@gmail.com</a> dengan subjek <strong className="text-foreground">"Pengajuan Refund - [Nama Akun]"</strong>.</li>
              <li>Sertakan informasi berikut: nama lengkap, email akun, tanggal pembelian, jumlah kredit yang dibeli, dan alasan refund.</li>
              <li>Tim kami akan memverifikasi pengajuan dalam 2-3 hari kerja.</li>
              <li>Jika disetujui, refund akan diproses ke metode pembayaran asli dalam 5-7 hari kerja.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Gangguan Layanan</h2>
            <p>Jika terjadi gangguan layanan yang signifikan yang disebabkan oleh kesalahan di pihak Mution (downtime melebihi SLA yang dijanjikan), pengguna berhak mendapatkan kompensasi dalam bentuk kredit tambahan. Besaran kompensasi akan ditentukan berdasarkan durasi dan dampak gangguan.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Kontak</h2>
            <p>
              Untuk pertanyaan lebih lanjut terkait kebijakan refund, silakan hubungi kami di{" "}
              <a href="mailto:supportmution@gmail.com" className="text-primary hover:underline">supportmution@gmail.com</a>{" "}
              atau melalui halaman <Link href="/kontak" className="text-primary hover:underline">Kontak</Link>.
            </p>
          </section>

        </div>
      </main>

      <PageFooter />
    </div>
  );
}
