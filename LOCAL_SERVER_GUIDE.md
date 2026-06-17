# Panduan Penyediaan & Optimalisasi Server Lokal CBT Sekolah

Dokumen ini ditujukan untuk proktor atau teknisi IT sekolah guna melakukan setup, optimasi, dan pemeliharaan server lokal CBT agar stabil saat diakses ratusan siswa secara bersamaan.

---

## 1. Spesifikasi Minimum Hardware Server

| Komponen | Spesifikasi Rekomendasi (untuk ~300 Siswa Aktif) |
| :--- | :--- |
| **CPU** | Intel Xeon / Core i7-i9, Minimal 8 Cores / 16 Threads |
| **RAM** | 16 GB - 32 GB DDR4/DDR5 |
| **Penyimpanan** | SSD NVMe Minimal 512 GB (Sangat disarankan menggunakan RAID 1 untuk backup) |
| **Jaringan** | Gigabit Ethernet (1 Gbps) terhubung langsung ke switch utama sekolah |
| **Sistem Operasi**| Ubuntu Server 22.04 LTS atau Linux Debian Terbaru |
| **Kelistrikan** | Wajib menggunakan UPS (Uninterruptible Power Supply) min. 1200VA |

---

## 2. Struktur Arsitektur & High Availability

Aplikasi ini menggunakan **Nginx** sebagai pintu gerbang utama (Load Balancer & Reverse Proxy) yang membagi beban kerja secara merata ke beberapa instance **NestJS API** secara paralel. Hal ini memaksimalkan penggunaan seluruh core CPU pada server (Node.js secara default hanya berjalan pada single thread).

Untuk mengamankan data pengerjaan siswa saat listrik padam secara mendadak, caching engine **Redis** dikonfigurasi dengan opsi **AOF (Append Only File)** yang menyimpan setiap riwayat jawaban ke SSD setiap detik.

```
                  [ Siswa / iPad Client ]
                             │
                             ▼ (Port 80)
                     [ Nginx Load Balancer ]
                             │
            ┌────────────────┼────────────────┐ (Reverse Proxy)
            ▼                ▼                ▼
     [ API Instance 1 ] [ API Instance 2 ] [ API Instance 3 ]
            │                │                │
            └────────────────┼────────────────┘
                             ▼
         [ Redis (Cache & Active Sync via Adapter) ]
                             │
                             ▼
                    [ PostgreSQL Database ]
```

---

## 3. Cara Menjalankan & Melakukan Scaling Server

Gunakan Docker Compose untuk menjalankan aplikasi. Untuk menangani beban tinggi, Anda bisa menduplikasi (scale) kontainer backend NestJS API.

### Langkah-langkah:
1. Pastikan Docker dan Docker Compose telah terinstal di server.
2. Clone/salin folder proyek ini ke direktori server (misal `/opt/cbt`).
3. Buat atau sesuaikan file `.env` di folder root.
4. Jalankan perintah berikut untuk membangun dan menjalankan server dengan **3 instance API backend**:
   ```bash
   docker-compose up -d --scale api=3 --build
   ```
5. Periksa status kontainer:
   ```bash
   docker-compose ps
   ```

Aplikasi sekarang dapat diakses secara lokal oleh siswa di alamat IP server lokal sekolah (contoh: `http://192.168.1.100` di port 80).

---

## 4. Strategi Penanganan Mati Lampu & Kegagalan Listrik (UPS & Redis AOF)

Sering terjadi listrik sekolah padam secara mendadak saat ujian. Kami memitigasinya dengan cara:
1. **Pemasangan UPS:** Server lokal wajib dihubungkan ke UPS. Jika listrik padam, UPS memberikan waktu ~15-20 menit bagi teknisi untuk mematikan server dengan aman (`docker-compose down`).
2. **Redis AOF Persistence:** Dalam `docker-compose.yml`, Redis dijalankan dengan opsi:
   `--appendonly yes --appendfsync everysec`
   Setiap detik, Redis menyimpan jawaban siswa ke SSD. Jika server mati mendadak, maksimal hanya 1 detik jawaban terakhir yang berisiko hilang.
3. **Database Syncing:** Jawaban siswa di-autosave ke Redis setiap 5 detik melalui koneksi WebSocket yang ringan. Database PostgreSQL baru akan diisi (bulk upsert) saat siswa menekan tombol "Kumpulkan" (`submit`). Hal ini menjaga performa database PostgreSQL tetap sangat ringan.

---

## 5. Prosedur Backup Berkala (PostgreSQL)

Buat script cron job di server lokal untuk melakukan backup database PostgreSQL secara otomatis ke penyimpanan luar (Flashdisk/NAS) setiap 1 jam selama masa ujian.

### Script Backup Otomatis (`backup.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/opt/cbt/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="cbt_db_backup_$TIMESTAMP.sql"

# Buat direktori backup jika belum ada
mkdir -p $BACKUP_DIR

# Dump database dari container postgres
docker exec cbt_postgres pg_dump -U cbt_user -d cbt > $BACKUP_DIR/$FILENAME

# Hapus backup yang lebih lama dari 7 hari
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -exec rm {} \;

echo "Backup database sukses disimpan di: $BACKUP_DIR/$FILENAME"
```

Jalankan script ini setiap jam menggunakan Cron Job Linux:
```bash
# Buka cron editor
crontab -e

# Tambahkan baris ini di paling bawah untuk backup setiap jam
0 * * * * /opt/cbt/backup.sh
```

---

## 6. Monitoring Kesehatan Server

Gunakan perintah bawaan docker untuk memonitor beban CPU dan RAM di server secara real-time saat ujian berlangsung:
```bash
docker stats
```
Pastikan utilitas CPU tidak menyentuh angka 95% secara terus-menerus. Jika beban CPU sangat tinggi, Anda dapat menambah kapasitas RAM server atau menaikkan jumlah scale api instance (misal menjadi `--scale api=4`).
