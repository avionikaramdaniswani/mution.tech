import { PublicNavbar } from "@/components/public-navbar";
import { PageHero } from "@/components/page-hero";
import { PageFooter } from "@/components/page-footer";
import { Link } from "wouter";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <PageHero
        eyebrow="Legal"
        title="Kebijakan Privasi"
        subtitle="Terakhir diperbarui: Juni 2026"
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Pendahuluan</h2>
            <p>Mution ("kami", "kita") berkomitmen untuk melindungi privasi kamu. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi kamu saat menggunakan layanan kami di mution.tech.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Informasi yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan informasi berikut saat kamu menggunakan layanan Mution:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-foreground">Informasi Akun:</strong> Nama, alamat email, dan kata sandi (disimpan dalam bentuk terenkripsi)</li>
              <li><strong className="text-foreground">Data Penggunaan:</strong> Log aktivitas, waktu login, dan tindakan di dalam platform</li>
              <li><strong className="text-foreground">Data Proyek:</strong> Nama proyek, konfigurasi, environment variable (terenkripsi), dan log deployment</li>
              <li><strong className="text-foreground">Data Teknis:</strong> Alamat IP, jenis browser, sistem operasi, dan informasi perangkat</li>
              <li><strong className="text-foreground">Data Transaksi:</strong> Riwayat topup kredit dan penggunaan resource</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Cara Kami Menggunakan Informasi</h2>
            <p>Informasi yang dikumpulkan digunakan untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Menyediakan, mengoperasikan, dan meningkatkan layanan Mution</li>
              <li>Memproses transaksi dan mengelola kredit akun kamu</li>
              <li>Mengirimkan notifikasi penting terkait layanan (downtime, pembaruan, keamanan)</li>
              <li>Mendeteksi dan mencegah penyalahgunaan, penipuan, dan aktivitas ilegal</li>
              <li>Menganalisis penggunaan platform untuk meningkatkan pengalaman pengguna</li>
              <li>Memenuhi kewajiban hukum yang berlaku</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Penyimpanan dan Keamanan Data</h2>
            <p>Data kamu disimpan di server yang berlokasi di Indonesia dan/atau wilayah Asia Tenggara. Kami menerapkan langkah-langkah keamanan teknis dan organisasional yang wajar, termasuk enkripsi data saat penyimpanan dan transmisi, akses terbatas berbasis peran, serta audit log keamanan rutin.</p>
            <p className="mt-3">Environment variable proyek kamu disimpan dengan masking - nilai tidak pernah ditampilkan dalam bentuk teks biasa setelah disimpan.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Berbagi Data dengan Pihak Ketiga</h2>
            <p>Kami <strong className="text-foreground">tidak menjual</strong> data pribadi kamu kepada pihak ketiga. Kami dapat berbagi informasi dalam situasi terbatas berikut:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-foreground">Penyedia Infrastruktur:</strong> Layanan cloud yang kami gunakan untuk mengoperasikan platform (terikat oleh perjanjian kerahasiaan)</li>
              <li><strong className="text-foreground">Pemroses Pembayaran:</strong> Tripay untuk memproses transaksi topup kredit</li>
              <li><strong className="text-foreground">Kewajiban Hukum:</strong> Jika diwajibkan oleh hukum atau perintah pengadilan yang sah</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Cookie dan Teknologi Pelacakan</h2>
            <p>Mution menggunakan cookie <em>httpOnly</em> yang aman untuk mengelola sesi login kamu. Cookie ini tidak dapat diakses oleh JavaScript dan tidak digunakan untuk pelacakan iklan. Kami tidak menggunakan cookie pihak ketiga untuk keperluan pemasaran.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Hak Kamu atas Data Pribadi</h2>
            <p>Sesuai peraturan yang berlaku, kamu memiliki hak untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-foreground">Akses:</strong> Meminta salinan data pribadi yang kami simpan tentang kamu</li>
              <li><strong className="text-foreground">Koreksi:</strong> Memperbarui data yang tidak akurat melalui halaman Profil</li>
              <li><strong className="text-foreground">Penghapusan:</strong> Meminta penghapusan akun dan data terkait</li>
              <li><strong className="text-foreground">Portabilitas:</strong> Meminta ekspor data proyek dan aktivitas kamu</li>
            </ul>
            <p className="mt-3">Untuk menggunakan hak-hak ini, hubungi kami di <a href="mailto:supportmution@gmail.com" className="text-primary hover:underline">supportmution@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Retensi Data</h2>
            <p>Data akun aktif disimpan selama akun kamu aktif. Jika kamu menghapus akun, data akan dihapus dalam 30 hari, kecuali jika kami diwajibkan menyimpannya lebih lama oleh hukum (misalnya data transaksi keuangan).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Perubahan Kebijakan Privasi</h2>
            <p>Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Jika ada perubahan signifikan, kami akan memberikan pemberitahuan melalui email atau notifikasi di platform. Penggunaan Layanan setelah perubahan dianggap sebagai penerimaan kebijakan baru.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Hubungi Kami</h2>
            <p>Jika kamu memiliki pertanyaan atau kekhawatiran tentang Kebijakan Privasi ini, silakan hubungi kami:</p>
            <div className="mt-3 p-4 rounded-xl space-y-1 border border-border/70 bg-card">
              <p><strong className="text-foreground">Email:</strong>{" "}<a href="mailto:supportmution@gmail.com" className="text-primary hover:underline">supportmution@gmail.com</a></p>
              <p><strong className="text-foreground">Mution</strong> - Platform Infrastruktur Modern</p>
            </div>
          </section>

        </div>
      </main>

      <PageFooter />
    </div>
  );
}
