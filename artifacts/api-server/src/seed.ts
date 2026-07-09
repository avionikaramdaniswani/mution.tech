import { db } from "@workspace/db";
import { changelogsTable } from "@workspace/db/schema";
import "dotenv/config";

async function run() { 
  await db.insert(changelogsTable).values([
    {
      version: 'v1.2.0', 
      date: 'Hari Ini', 
      title: 'Fitur Monitoring API & Redesign', 
      description: 'Pembaruan besar pada sisi monitoring penggunaan API dan peningkatan pengalaman pengguna pada halaman navigasi dan riwayat transaksi.', 
      changes: [
        {type: 'feat', title: 'Halaman API Usage', description: 'Memantau pemakaian token, model AI, dan kredit secara transparan.'}, 
        {type: 'feat', title: 'Summary Cards', description: 'Memberikan insight total request dan biaya API pada bulan berjalan.'}, 
        {type: 'chore', title: 'Redesign Riwayat Transaksi', description: 'Halaman diubah menjadi card list dengan tampilan yang lebih rapi.'}, 
        {type: 'chore', title: 'Navigasi lebih ringkas', description: 'Restrukturisasi menu sidebar dan dropdown profil.'}
      ]
    }, 
    {
      version: 'v1.1.0', 
      date: 'Kemarin', 
      title: 'Penyesuaian Harga & Dokumentasi Lengkap', 
      changes: [
        {type: 'feat', title: 'Halaman Dokumentasi', description: 'Docs dirilis dengan contoh integrasi yang lebih lengkap.'}, 
        {type: 'chore', title: 'Penyesuaian harga model', description: 'Harga model Claude Opus disesuaikan untuk semua varian.'}, 
        {type: 'fix', title: 'Konten pricing dirapikan', description: 'Bagian FAQ duplikat dan blok tarif lama dihapus.'}
      ]
    }, 
    {
      version: 'v1.0.0', 
      date: 'Beberapa hari lalu', 
      title: 'Rilis Awal Mution AI Proxy', 
      description: 'Peluncuran perdana platform Mution AI Proxy. Satu endpoint, beragam model LLM kelas dunia.', 
      changes: [
        {type: 'feat', title: 'Proxy API', description: 'Sistem proxy API yang kompatibel dengan alur integrasi populer.'}, 
        {type: 'feat', title: 'Manajemen API Key', description: 'Pengelolaan API key dibuat lebih mudah dari dashboard.'}, 
        {type: 'feat', title: 'Billing dan top up', description: 'Sistem billing dan top up otomatis untuk penggunaan layanan.'}
      ]
    }
  ]); 
  console.log('Seeded'); 
  process.exit(0); 
} 
run();
