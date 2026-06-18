<div align="center">

# 🎓 CBT Sekolah

**Aplikasi Ujian Berbasis Komputer (Computer Based Test) untuk Sekolah**

Dikembangkan oleh **[adilabs.id](https://adilabs.id)**

</div>

---

## 📋 Tentang Aplikasi

**CBT Sekolah** adalah platform ujian digital untuk sekolah yang dapat dijalankan di **server lokal (LAN)** maupun **cloud/VPS**. Dirancang untuk penyelenggaraan ujian yang aman, real-time, dan mudah dikelola oleh admin & guru.

## ✨ Fitur Utama

- 👥 **Manajemen Pengguna** — admin, guru, siswa; import massal siswa (Excel/CSV); jenjang/kelas/rombel.
- 📝 **Bank Soal Lengkap** — 7 tipe soal: Pilihan Ganda, Pilihan Jamak, Benar/Salah, Isian Singkat, Isian Rumpang, Menjodohkan, Esai. Import dari Word/Excel/teks + gambar.
- 🔀 **Pengacakan** — acak urutan soal & pilihan jawaban per siswa (penilaian tetap akurat).
- 🖥️ **Lockdown Ujian** — mode layar penuh otomatis (tanpa install) + deteksi pelanggaran (pindah tab, copy, klik kanan, dll). Dukungan **Safe Exam Browser (SEB)** opsional.
- 📡 **Monitoring Real-time** — pantau siswa, progres, & pelanggaran secara langsung; siarkan pengumuman; koreksi/anulir soal saat ujian berjalan.
- 📊 **Hasil & Analisis** — nilai otomatis, analisis butir soal (tingkat kesulitan & daya pembeda), export Excel.
- 🔒 **Anti-bocor** — siswa hanya melihat nilai; kunci jawaban tidak ditampilkan.
- 📱 **PWA** — bisa dipasang sebagai aplikasi di perangkat siswa.

## 🛠️ Teknologi

Monorepo (Turborepo):
- **Backend**: NestJS + Prisma (PostgreSQL), Redis, Socket.io
- **Frontend**: Next.js 14 + Tailwind CSS
- **Infrastruktur**: Docker Compose + Nginx

## 🚀 Instalasi & Penggunaan

📖 Panduan lengkap instalasi di server lokal sekolah dan cara penggunaan (Admin, Guru, Siswa):

👉 **[MANUAL_BOOK.md](MANUAL_BOOK.md)**

⚙️ Spesifikasi hardware & optimasi performa (ratusan siswa serentak):

👉 **[LOCAL_SERVER_GUIDE.md](LOCAL_SERVER_GUIDE.md)**

### Ringkas (server lokal):
```bash
git clone https://github.com/Adi-Sumardi/cbt.git /opt/cbt && cd /opt/cbt
cp .env.example .env   # lalu sesuaikan IP server & password
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec -T api npx prisma db seed
```
Akses: `http://IP_SERVER` — login admin: `admin@cbt.local` / `admin123` (segera ganti password).

## 📜 Lisensi & Hak Cipta

© 2026 **adilabs.id** (Adi Sumardi). Seluruh hak dilindungi.

Aplikasi ini **bukan perangkat lunak sumber terbuka**. **Dilarang menjual, menyewakan, mendistribusikan ulang, atau memperdagangkan** aplikasi ini maupun turunannya **tanpa izin tertulis dari adilabs.id**.

Selengkapnya lihat berkas **[LICENSE](LICENSE)**.

## 📬 Kontak

Untuk izin komersial, kerja sama, atau pembelian lisensi:
**adilabs.id** — adisumardi888@gmail.com

---

<div align="center">
Dibuat dengan ❤️ oleh <b>adilabs.id</b>
</div>
