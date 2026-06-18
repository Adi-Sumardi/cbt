# 📘 Manual Book — CBT Sekolah (Instalasi Server Lokal & Penggunaan)

Panduan lengkap memasang aplikasi **CBT Sekolah** di **server lokal sekolah (jaringan LAN)** dan cara penggunaannya untuk Admin, Guru, dan Siswa.

> Untuk spesifikasi hardware & optimasi performa (ratusan siswa serentak), lihat **[LOCAL_SERVER_GUIDE.md](LOCAL_SERVER_GUIDE.md)**.

---

## Daftar Isi
- [A. Persiapan Server](#a-persiapan-server)
- [B. Instalasi Aplikasi](#b-instalasi-aplikasi)
- [C. Konfigurasi Awal](#c-konfigurasi-awal)
- [D. Akses dari Perangkat Siswa](#d-akses-dari-perangkat-siswa)
- [E. Panduan Admin](#e-panduan-admin)
- [F. Panduan Guru](#f-panduan-guru)
- [G. Panduan Siswa](#g-panduan-siswa)
- [H. Keamanan Ujian (Lockdown)](#h-keamanan-ujian-lockdown)
- [I. Backup & Restore Data](#i-backup--restore-data)
- [J. Update Aplikasi](#j-update-aplikasi)
- [K. Menyalakan Ulang & Auto-Start](#k-menyalakan-ulang--auto-start)
- [L. Troubleshooting](#l-troubleshooting)
- [M. FAQ](#m-faq)
- [Lampiran: Perintah Penting](#lampiran-perintah-penting)

---

## A. Persiapan Server

### A.1 Kebutuhan minimum
- **Server**: PC/mini-server dengan **Ubuntu Server 22.04 LTS** (disarankan). RAM min. 8 GB (16 GB untuk >150 siswa), SSD.
- **Jaringan**: server terhubung ke **switch utama** sekolah via kabel (Gigabit). Semua perangkat siswa harus berada di **jaringan LAN/Wi-Fi yang sama**.
- **UPS**: sangat disarankan agar data tidak hilang saat listrik padam.

### A.2 Set IP statis untuk server
Agar alamat server tidak berubah-ubah, **wajib** set IP statis. Contoh IP: `192.168.1.10`.

Cek IP server saat ini:
```bash
ip addr show
```
Atur IP statis (Ubuntu, lewat netplan) — sesuaikan nama interface (mis. `enp3s0`) dan IP gateway sekolah:
```bash
sudo nano /etc/netplan/01-netcfg.yaml
```
```yaml
network:
  version: 2
  ethernets:
    enp3s0:
      dhcp4: no
      addresses: [192.168.1.10/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [192.168.1.1, 8.8.8.8]
```
```bash
sudo netplan apply
```
> Catat IP ini — sebut sebagai **`IP_SERVER`** di langkah-langkah berikut (contoh: `192.168.1.10`).

### A.3 Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker
docker --version && docker compose version
```

---

## B. Instalasi Aplikasi

### B.1 Ambil kode aplikasi
Jika server terhubung internet:
```bash
sudo git clone https://github.com/Adi-Sumardi/cbt.git /opt/cbt
cd /opt/cbt
```
Jika **offline**: salin folder proyek (mis. via flashdisk) ke `/opt/cbt`, lalu `cd /opt/cbt`.

### B.2 Buat file konfigurasi `.env`
```bash
sudo nano /opt/cbt/.env
```
Isi dengan (ganti `IP_SERVER` dengan IP statis server, mis. `192.168.1.10`; ganti password dengan yang kuat):
```env
# ─── PostgreSQL ───
POSTGRES_DB=cbt
POSTGRES_USER=cbt_user
POSTGRES_PASSWORD=GANTI_PASSWORD_DB_KUAT

# ─── Redis ───
REDIS_PASSWORD=GANTI_PASSWORD_REDIS_KUAT

# ─── API (NestJS) ───
DATABASE_URL=postgresql://cbt_user:GANTI_PASSWORD_DB_KUAT@postgres:5432/cbt
REDIS_URL=redis://:GANTI_PASSWORD_REDIS_KUAT@redis:6379
JWT_SECRET=GANTI_JWT_SECRET_ACAK_PANJANG
PORT=3001
NODE_ENV=production
WEB_URL=http://IP_SERVER

# ─── Web (Next.js) ───
# Dikosongkan = aplikasi memanggil API lewat alamat yang sama (same-origin) → tahan walau IP berubah
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
API_URL=http://api:3001
NEXTAUTH_URL=http://IP_SERVER
NEXTAUTH_SECRET=GANTI_NEXTAUTH_SECRET_ACAK_PANJANG
```
> 💡 Hasilkan secret acak dengan: `openssl rand -base64 48`

Amankan file:
```bash
sudo chmod 600 /opt/cbt/.env
```

### B.3 Gunakan port 80 (URL bersih tanpa `:8080`)
Agar siswa cukup mengetik `http://IP_SERVER` (tanpa port), ubah pemetaan port Nginx:
```bash
sudo nano /opt/cbt/docker-compose.prod.yml
```
Cari bagian service `nginx` → `ports`, ubah:
```yaml
    ports:
      - '8080:80'
```
menjadi:
```yaml
    ports:
      - '80:80'
```
> Jika port 80 sudah dipakai aplikasi lain, biarkan `8080:80` dan akses pakai `http://IP_SERVER:8080` (sesuaikan juga `WEB_URL` & `NEXTAUTH_URL` agar memakai `:8080`).

### B.4 Build & jalankan
```bash
cd /opt/cbt
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d
```
Build pertama butuh 5–15 menit. Cek status (semua harus `Up`):
```bash
sudo docker compose -f docker-compose.prod.yml ps
```

### B.5 Siapkan database (migrasi + data awal)
```bash
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma db seed
```

### B.6 Verifikasi
Dari server:
```bash
curl -I http://localhost
```
Harus muncul `HTTP/1.1 307` (redirect ke halaman login) — artinya aplikasi jalan. Lalu buka browser di server: `http://IP_SERVER`.

---

## C. Konfigurasi Awal

### C.1 Login sebagai Admin
Buka `http://IP_SERVER` → login:
- **Email**: `admin@cbt.local`
- **Password**: `admin123`

> ⚠️ **Segera ganti password** semua akun bawaan setelah instalasi.

### C.2 Set Alamat Server di pengaturan
Masuk **Admin → Pengaturan (Settings) → Pengaturan Jaringan**:
- **Server URL / IP**: isi `http://IP_SERVER` (mis. `http://192.168.1.10`). Bisa klik **Auto-detect**.
- **Domain** (opsional): kosongkan untuk server lokal.
- Klik **Simpan Pengaturan Jaringan**.

Ini memastikan fitur **monitoring ujian real-time (WebSocket)** dan **kode akses ujian** mengarah ke alamat server yang benar.

### C.3 Akun bawaan (dari seeder)
| Peran | Email | Password |
|-------|-------|----------|
| Admin | admin@cbt.local | admin123 |
| Guru  | guru@cbt.local | guru123 |
| Guru  | sari@cbt.local | guru123 |
| Siswa | (contoh) andi@cbt.local | siswa123 |

> Akun siswa contoh dari seeder boleh dihapus; siswa asli dibuat/di-import di panel Admin.

---

## D. Akses dari Perangkat Siswa

1. Pastikan perangkat siswa (laptop/PC/tablet) terhubung ke **Wi-Fi/LAN yang sama** dengan server.
2. Buka browser (Chrome disarankan), ketik: **`http://IP_SERVER`** (mis. `http://192.168.1.10`).
3. Siswa login dengan akun masing-masing, lalu masuk ujian memakai **kode ujian** dari guru.

> 💡 **Tips:** sebarkan link siap-pakai berisi kode, mis. `http://192.168.1.10/exam?code=ABC123` — kode otomatis terisi.

> 💡 **PWA:** aplikasi bisa "di-install" sebagai aplikasi (banner muncul otomatis) untuk akses layar penuh & cepat.

---

## E. Panduan Admin

Menu Admin (sidebar kiri):

### E.1 Manajemen Pengguna (`Pengguna`)
- **Tambah satuan**: tombol **Tambah Pengguna** → isi nama, email, peran (Admin/Guru/Siswa), dan untuk siswa: jenjang/kelas/rombel + NIS.
- **Import massal siswa**: tombol **Import** → unggah file Excel/CSV sesuai format. Cocok untuk mendaftarkan banyak siswa sekaligus.
- **Filter**: berdasarkan peran, jenjang, kelas, rombel. **Cari**: nama/email/NIS.
- **Edit / Hapus** per pengguna.

### E.2 Manajemen Ujian (`Ujian`)
- Melihat **seluruh ujian dari semua guru** beserta nama guru pembuat.
- Admin dapat **Edit**, **Kelola soal**, dan mengubah status (Aktifkan/Selesaikan) ujian milik guru mana pun.

### E.3 Pengaturan (`Settings`)
- **Identitas sekolah** (nama, dll).
- **Pengaturan Jaringan** (Server URL/IP & domain) — lihat [C.2](#c2-set-alamat-server-di-pengaturan).
- **Backup database** (lihat [Bagian I](#i-backup--restore-data)).

### E.4 Laporan (`Reports`)
Rekap nilai & statistik. Bisa **export Excel**.

---

## F. Panduan Guru

### F.1 Membuat ujian
**Dashboard Guru → Ujian → Buat Ujian Baru**. Isi:
- Judul, deskripsi, **durasi** (menit), **KKM** (nilai lulus).
- **Target peserta**: jenjang/kelas/rombel.
- Opsi: **Acak soal**, **Acak pilihan jawaban**, **Tampilkan hasil**, **Wajib SEB** (opsional — lihat [Bagian H](#h-keamanan-ujian-lockdown)).

### F.2 Menambah soal
Buka ujian → **Kelola**. Cara menambah:
1. **Manual**: tombol tambah soal → pilih tipe:
   - Pilihan Ganda, Pilihan Jamak, Benar/Salah, Isian Singkat, Isian Rumpang, Menjodohkan, Esai.
   - Untuk pilihan ganda: tandai opsi yang **benar**.
2. **Import**: menu **Import** → tempel/unggah soal dari **Word/Excel/teks** sesuai format yang tersedia. Gambar soal juga didukung.

### F.3 Mengaktifkan ujian
Ubah status ujian menjadi **ACTIVE** agar siswa bisa masuk. Bagikan **Kode Akses** (atau link `http://IP_SERVER/exam?code=KODE`) ke siswa.

### F.4 Memantau ujian (real-time)
Buka ujian → **Monitor**:
- Lihat siswa yang sedang mengerjakan, progres, dan **pelanggaran** (pindah tab, keluar layar penuh, dll).
- **Siarkan Pengumuman** ke semua peserta.
- **Koreksi Soal** saat ujian berlangsung: **Edit Soal** atau **Anulir** (soal dianulir → semua siswa dapat poin penuh).

### F.5 Melihat hasil
Buka ujian → **Hasil (Results)**:
- Rekap nilai per siswa, lulus/tidak, jumlah pelanggaran.
- **Analisis Butir Soal** (tingkat kesulitan & daya pembeda).
- **Export Excel**.

---

## G. Panduan Siswa

1. Login di `http://IP_SERVER` dengan akun siswa.
2. Klik **Mulai Ujian**, masukkan **Kode Ujian** dari guru.
3. Muncul layar **"Mulai & Masuk Layar Penuh"** → klik untuk mulai (ujian terkunci layar penuh).
4. Kerjakan soal, jawaban **tersimpan otomatis**. Tandai **ragu-ragu** bila perlu.
5. Klik **Kumpulkan** bila selesai (atau otomatis saat waktu habis).
6. Setelah selesai, siswa **hanya melihat nilai** — kunci jawaban & pembahasan tidak ditampilkan.

> ⚠️ Selama ujian, **jangan keluar dari layar penuh, pindah tab, atau buka aplikasi lain** — semua tercatat sebagai pelanggaran dan dipantau guru.

---

## H. Keamanan Ujian (Lockdown)

### H.1 Mode Layar Penuh (default — tanpa install)
Berlaku **otomatis untuk semua ujian**. Siswa wajib masuk layar penuh; keluar layar penuh / pindah tab / klik kanan / copy / shortcut tertentu → **tercatat sebagai pelanggaran** dan diawasi guru di halaman Monitor. Tidak perlu instalasi apa pun di perangkat siswa.

### H.2 Safe Exam Browser (SEB) — opsional
Untuk pengamanan lebih ketat (mengunci seluruh perangkat), guru bisa mengaktifkan **Wajib SEB** pada ujian. Konsekuensinya:
- Siswa **harus meng-install** aplikasi Safe Exam Browser (hanya Windows/macOS/iOS — tidak bisa Android/HP biasa).
- Aplikasi otomatis menyediakan file `.seb` dan tombol **"Buka di Safe Exam Browser"**.

> Biarkan **Wajib SEB OFF** untuk ujian umum agar siswa cukup pakai browser biasa. Aktifkan hanya di lab yang SEB-nya sudah terpasang.

---

## I. Backup & Restore Data

### I.1 Backup otomatis lewat panel Admin
**Admin → Settings → Backup** untuk mengunduh dump database.

### I.2 Backup manual (disarankan rutin)
```bash
cd /opt/cbt
sudo docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U cbt_user cbt > backup-cbt-$(date +%F).sql
```
Salin file `.sql` ke media eksternal/flashdisk secara berkala.

### I.3 Restore
```bash
cd /opt/cbt
cat backup-cbt-2026-06-18.sql | sudo docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cbt_user -d cbt
```

> File upload (gambar soal) tersimpan di volume Docker `cbt_uploads-data` — sertakan dalam strategi backup bila perlu.

---

## J. Update Aplikasi

Jika ada versi baru di repository:
```bash
cd /opt/cbt
sudo git pull origin main
sudo docker compose -f docker-compose.prod.yml build api web
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
```
Atau gunakan skrip bawaan: `sudo bash update.sh`.

---

## K. Menyalakan Ulang & Auto-Start

Agar aplikasi otomatis menyala saat server dinyalakan ulang, daftarkan service systemd:
```bash
sudo tee /etc/systemd/system/cbt.service > /dev/null <<'EOF'
[Unit]
Description=CBT Sekolah
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/cbt
ExecStart=docker compose -f docker-compose.prod.yml up -d
ExecStop=docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cbt.service
```
Container juga sudah ber-`restart: unless-stopped`, jadi otomatis hidup lagi bila crash.

**Perintah harian:**
```bash
sudo docker compose -f docker-compose.prod.yml ps        # cek status
sudo docker compose -f docker-compose.prod.yml restart   # restart semua
sudo docker compose -f docker-compose.prod.yml logs -f   # lihat log
```

---

## L. Troubleshooting

| Masalah | Penyebab & Solusi |
|---------|-------------------|
| Siswa tak bisa buka `http://IP_SERVER` | Pastikan perangkat **se-jaringan** dengan server; cek IP server (`ip addr`); cek firewall: `sudo ufw allow 80/tcp`. |
| Login gagal / loop ke login | `NEXTAUTH_URL` di `.env` harus **sama persis** dengan alamat yang diketik siswa (mis. `http://192.168.1.10`). Ubah `.env` lalu `up -d` ulang. |
| Container `api`/`web` `Restarting` | Cek log: `docker compose -f docker-compose.prod.yml logs api --tail=30`. Pastikan migrasi sudah dijalankan ([B.5](#b5-siapkan-database-migrasi--data-awal)). |
| Monitoring real-time tidak jalan | Set **Server URL** di Admin → Settings ([C.2](#c2-set-alamat-server-di-pengaturan)). |
| Halaman lama muncul terus | Minta siswa **hard refresh** (Ctrl/Cmd+Shift+R) — service worker PWA meng-cache. |
| Lupa password admin | Jalankan ulang seeder atau reset lewat database (hubungi teknisi). |
| Server lemot saat ratusan siswa | Lihat **[LOCAL_SERVER_GUIDE.md](LOCAL_SERVER_GUIDE.md)** untuk scaling & optimasi. |

---

## M. FAQ

**Q: Apakah butuh internet?**
A: Tidak untuk ujian. Setelah terpasang, semua berjalan di LAN sekolah. Internet hanya diperlukan saat instalasi/update (download image & kode).

**Q: Apakah acak soal mengubah kunci jawaban?**
A: Tidak. Jawaban dinilai berdasarkan **ID opsi**, bukan huruf/posisi — skor selalu akurat meski opsi diacak. Label A/B/C/D mengikuti posisi tampil.

**Q: Bisakah siswa melihat kunci jawaban setelah ujian?**
A: Tidak. Siswa **hanya melihat nilai**; kunci jawaban & pembahasan tidak dikirim ke siswa (anti-bocor/screenshot).

**Q: Berapa siswa yang bisa ujian bersamaan?**
A: Bergantung spesifikasi server. Lihat panduan hardware & optimasi di **[LOCAL_SERVER_GUIDE.md](LOCAL_SERVER_GUIDE.md)**.

**Q: Bagaimana jika listrik padam saat ujian?**
A: Jawaban tersimpan berkala (Redis AOF + autosave). Siswa dapat **melanjutkan** ujian setelah server menyala kembali. Gunakan **UPS** untuk keamanan maksimal.

---

## Lampiran: Perintah Penting

```bash
# Masuk folder aplikasi
cd /opt/cbt

# Status / start / stop / restart
sudo docker compose -f docker-compose.prod.yml ps
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml down
sudo docker compose -f docker-compose.prod.yml restart

# Lihat log
sudo docker compose -f docker-compose.prod.yml logs -f api
sudo docker compose -f docker-compose.prod.yml logs -f web

# Migrasi & seed database
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma db seed

# Backup database
sudo docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U cbt_user cbt > backup.sql

# Update aplikasi
sudo git pull origin main && sudo bash update.sh
```

---

*CBT Sekolah — Manual Book Instalasi Server Lokal. Untuk bantuan teknis lanjutan, hubungi pengembang/teknisi IT sekolah.*
