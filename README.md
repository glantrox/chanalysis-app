<p align="center">
  <img src="https://img.shields.io/badge/Electron-42.5.0-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Chart.js-4.5-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

# 📊 Chanalysis

**Chanalysis** adalah aplikasi desktop untuk menganalisis riwayat chat WhatsApp secara visual. Cukup ekspor chat dari WhatsApp, unggah file `.txt`-nya, dan dapatkan insight mendalam tentang pola komunikasi — semua diproses **100% secara lokal** di perangkat Anda.

> 🔒 **Privasi Terjamin** — Tidak ada data yang dikirim ke server manapun. Semua analisis dilakukan secara offline di dalam aplikasi.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 📈 **Dashboard Statistik** | Total pesan, hari teraktif, jam teramai, dan jumlah partisipan |
| 🏆 **Insight Karakteristik** | Raja stiker/media, orang paling panjang lebar, dan paling suka share link |
| 💬 **Analisis Bahasa & Perilaku** | Kata paling sering digunakan, emoji favorit, dan rata-rata waktu balas per orang |
| 📊 **Grafik Interaktif** | Keaktifan 7 hari terakhir, frekuensi pesan harian, dan distribusi jam aktif |
| 🔍 **Detail Per Partisipan** | Klik kartu partisipan untuk melihat statistik detail dalam modal bento grid |
| 📅 **Filter Tanggal** | Analisis hanya pesan dari tanggal tertentu ke atas |
| 🔄 **Sorting Fleksibel** | Urutkan partisipan berdasarkan jumlah pesan, waktu balas, atau nama |
| 🌙 **Dark Mode** | Toggle tema gelap/terang sesuai preferensi |
| 🖱️ **Drag & Drop** | Tarik dan lepas file langsung ke aplikasi |

---

## 📸 Cara Kerja

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Ekspor Chat │ ──▶ │ Unggah File  │ ──▶ │  Dashboard   │
│  dari WA     │     │   .txt       │     │  Analisis    │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **Buka** chat/grup WhatsApp di HP
2. **Ekspor** chat via menu `⋮` → `Lainnya` → `Ekspor Chat` → **Tanpa Media**
3. **Pindahkan** file `.txt` ke komputer
4. **Buka** Chanalysis dan drag & drop file tersebut
5. **Lihat** hasil analisis secara instan!

---

## 🚀 Instalasi & Menjalankan

### Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- npm (sudah termasuk dengan Node.js)

### Langkah-langkah

```bash
# 1. Clone repositori
git clone https://github.com/glantrox/chanalysis-app.git
cd chanalysis-app

# 2. Install dependensi
npm install

# 3. Jalankan aplikasi
npm start
```

Aplikasi akan otomatis build Tailwind CSS dan membuka jendela Electron.

---

## 📦 Build & Packaging

```bash
# Package aplikasi (tanpa installer)
npm run package

# Buat installer (dmg/exe/deb/rpm)
npm run make
```

Output akan berada di folder `out/`.

---

## 🗂️ Struktur Proyek

```
chanalysis-app/
├── src/
│   ├── index.js          # Electron main process
│   ├── preload.js        # Preload script (context bridge)
│   ├── index.html        # Halaman utama UI
│   ├── renderer.js       # Logika frontend (parsing, chart, UI)
│   ├── input.css         # Source Tailwind CSS
│   ├── index.css         # Built CSS (auto-generated)
│   └── vendor/           # Library lokal (Chart.js, Font Awesome)
├── forge.config.js       # Konfigurasi Electron Forge
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

- **[Electron](https://www.electronjs.org/)** — Framework desktop cross-platform
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS framework
- **[Chart.js](https://www.chartjs.org/)** — Library grafik interaktif
- **[Font Awesome](https://fontawesome.com/)** — Ikon UI
- **[Electron Forge](https://www.electronforge.io/)** — Tooling untuk build & packaging

---

## 📄 Format Chat yang Didukung

Chanalysis mendukung format ekspor chat WhatsApp standar:

```
[DD/MM/YY, HH.MM.SS] Nama Pengirim: Isi pesan
```

Contoh:
```
[28/06/25, 14.30.15] Budi: Halo, apa kabar?
[28/06/25, 14.31.02] Ani: Baik! Kamu gimana?
```

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan buka **Issue** atau kirim **Pull Request**.

1. Fork repositori ini
2. Buat branch fitur (`git checkout -b fitur/fitur-baru`)
3. Commit perubahan (`git commit -m 'Menambahkan fitur baru'`)
4. Push ke branch (`git push origin fitur/fitur-baru`)
5. Buka Pull Request

---

## 📝 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

---

<p align="center">
  Dibuat dengan ❤️ oleh <a href="https://github.com/glantrox">glantrox</a>
</p>
