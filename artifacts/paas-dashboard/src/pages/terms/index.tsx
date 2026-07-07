import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <PageHero
        eyebrow="Legal"
        title="Syarat & Ketentuan"
        subtitle="Terakhir diperbarui: Juni 2026"
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Penerimaan Syarat</h2>
            <p>Dengan mendaftar dan menggunakan layanan Mution ("Layanan") yang tersedia di mution.tech, kamu menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat & Ketentuan ini. Jika kamu tidak setuju dengan syarat ini, harap tidak menggunakan Layanan.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Deskripsi Layanan</h2>
            <p>Mution adalah platform infrastruktur sebagai layanan (Infrastructure as a Service / IaaS) yang memungkinkan pengguna untuk deploy, mengelola, dan memonitor aplikasi containerized. Layanan mencakup:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Hosting dan deployment aplikasi web</li>
              <li>Manajemen database (PostgreSQL)</li>
              <li>Manajemen environment variable</li>
              <li>Log deployment dan monitoring</li>
              <li>Sistem kredit dan billing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Akun Pengguna</h2>
            <p>Kamu bertanggung jawab penuh atas keamanan akun dan kata sandi kamu. Mution tidak bertanggung jawab atas kerugian akibat akses tidak sah ke akunmu. Kamu wajib segera memberi tahu kami jika terjadi pelanggaran keamanan akun.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Sistem Kredit dan Pembayaran</h2>
            <p>Layanan Mution menggunakan sistem kredit prabayar. Kredit yang telah dibeli akan dikurangi sesuai penggunaan resource (CPU, RAM, storage, bandwidth). Harga kredit dan tarif resource dapat berubah sewaktu-waktu dengan pemberitahuan sebelumnya.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Penggunaan yang Dilarang</h2>
            <p>Pengguna dilarang menggunakan Layanan untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Aktivitas ilegal atau yang melanggar hukum yang berlaku di Indonesia</li>
              <li>Menyebarkan malware, virus, atau konten berbahaya</li>
              <li>Melakukan serangan DDoS atau aktivitas hacking terhadap pihak lain</li>
              <li>Menjalankan cryptocurrency mining tanpa izin eksplisit</li>
              <li>Menyimpan atau mendistribusikan konten yang melanggar hak cipta</li>
              <li>Spam atau aktivitas yang mengganggu pengguna lain</li>
            </ul>
            <p className="mt-3">Pelanggaran terhadap ketentuan ini dapat mengakibatkan penangguhan atau penghentian akun tanpa pengembalian dana.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Ketersediaan Layanan</h2>
            <p>Mution berupaya menjaga ketersediaan layanan 24/7, namun tidak menjamin uptime 100%. Pemeliharaan terjadwal akan diinformasikan terlebih dahulu. Untuk detail SLA, lihat paket berlangganan masing-masing.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Privasi Data</h2>
            <p>Kami menghormati privasi pengguna. Data yang kamu berikan digunakan hanya untuk keperluan operasional layanan. Kami tidak menjual atau membagikan data pribadi kepada pihak ketiga tanpa izin, kecuali diwajibkan oleh hukum.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Batasan Tanggung Jawab</h2>
            <p>Sejauh diperbolehkan oleh hukum, Mution tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan, termasuk kehilangan data atau keuntungan.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Perubahan Syarat</h2>
            <p>Mution berhak mengubah Syarat & Ketentuan ini kapan saja. Perubahan signifikan akan diinformasikan melalui email atau notifikasi di platform. Penggunaan Layanan setelah perubahan dianggap sebagai penerimaan syarat baru.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Hukum yang Berlaku</h2>
            <p>Syarat & Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Negara Republik Indonesia. Setiap sengketa akan diselesaikan melalui musyawarah, dan jika tidak berhasil, melalui pengadilan yang berwenang di Indonesia.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Kontak</h2>
            <p>Pertanyaan terkait Syarat & Ketentuan ini dapat dikirimkan ke{" "}
              <a href="mailto:supportmution@gmail.com" className="text-primary hover:underline">supportmution@gmail.com</a>.
            </p>
          </section>

        </div>
      </main>

      <PageFooter />
    </div>
  );
}
