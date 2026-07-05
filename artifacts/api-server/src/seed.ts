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
        {type: 'feat', text: 'Halaman API Usage ditambahkan untuk memantau pemakaian token, model AI, dan kredit secara transparan.'}, 
        {type: 'feat', text: 'Summary Cards yang memberikan insight total request dan biaya API pada bulan berjalan.'}, 
        {type: 'chore', text: 'Desain ulang halaman Riwayat Transaksi menjadi bentuk Card List dengan efek elegan dark mode.'}, 
        {type: 'chore', text: 'Restrukturisasi menu navigasi Sidebar dan Dropdown Profil.'}
      ]
    }, 
    {
      version: 'v1.1.0', 
      date: 'Kemarin', 
      title: 'Penyesuaian Harga & Dokumentasi Lengkap', 
      changes: [
        {type: 'feat', text: 'Rilis Halaman Dokumentasi (Docs) lengkap dengan contoh integrasi via cURL, OpenAI SDK, dan Claude Code.'}, 
        {type: 'chore', text: 'Penurunan harga model Claude Opus (semua varian) sebesar 10%.'}, 
        {type: 'fix', text: 'Menghapus bagian FAQ yang duplikat pada halaman Harga serta menghapus blok tarif usang di halaman Dokumentasi.'}
      ]
    }, 
    {
      version: 'v1.0.0', 
      date: 'Beberapa hari lalu', 
      title: 'Rilis Awal Mution AI Proxy', 
      description: 'Peluncuran perdana platform Mution AI Proxy. Satu endpoint, beragam model LLM kelas dunia.', 
      changes: [
        {type: 'feat', text: 'Sistem Proxy API yang sepenuhnya kompatibel dengan OpenAI SDK.'}, 
        {type: 'feat', text: 'Manajemen API Key cerdas.'}, 
        {type: 'feat', text: 'Sistem Billing & Top Up otomatis terintegrasi TriPay.'}
      ]
    }
  ]); 
  console.log('Seeded'); 
  process.exit(0); 
} 
run();
