# FPL Scout — Panduan Fitur

## 🆓 Fitur Gratis

### Dashboard
Ringkasan cepat musim FPL kamu — top skor, pemain trending, dan statistik gameweek saat ini.

### Live Scores
Pantau skor pertandingan secara real-time saat gameweek sedang berlangsung.

### Fixtures
Kalender fixture semua tim untuk musim ini.
- **Filter Home/Away** — Lihat hanya fixture kandang atau tandang
- **Badge BGW/DGW** — Tandai gameweek kosong (Blank) atau ganda (Double) secara otomatis

### Player Stats
Tabel lengkap 500+ pemain dengan sorting dan filter.
- **Tab Stats** — Data lengkap: poin, form, gol, assist, clean sheet, harga, ownership
- **Tab Consistency** — Lihat pemain mana yang paling konsisten cetak poin tinggi setiap minggu. Pilih threshold (5+, 6+, 7+, 8+, 10+ poin) dan lihat berapa GW mereka tembus target

### Player Detail
Klik nama pemain untuk lihat profil lengkap:
- Foto, tim, posisi, status ketersediaan
- 12 statistik utama (poin, harga, form, xG, xA, dll)
- 6 fixture ke depan dengan tingkat kesulitan (warna hijau = mudah, merah = sulit)
- Riwayat poin per gameweek (highlight untuk GW dengan 7+ poin)

### Price Changes
Pantau pemain yang harganya naik atau turun.

### Standings
Klasemen Premier League terkini.

---

## ⭐ Fitur Premium — Analytics

### Differentials Finder
**Temukan permata tersembunyi.** Fitur ini mencari pemain dengan:
- Ownership rendah (di bawah 10% atau 5%)
- Form tinggi (minimal 4.0)
- Fixture mudah ke depan

Cocok untuk kamu yang ingin naik ranking dengan pemain yang jarang dimiliki orang lain. Semakin hijau fixture-nya, semakin mudah lawannya.

### Injury & Suspension Alerts
**Jangan sampai kecolongan.** Lihat semua pemain yang sedang:
- 🔴 Cedera (Injured)
- 🟡 Diragukan (Doubtful)
- 🟠 Diskors (Suspended)
- ⚪ Tidak tersedia (Unavailable)

Lengkap dengan persentase kemungkinan bermain dan berita terbaru dari FPL. Filter berdasarkan status untuk fokus ke yang paling penting.

### Form × Fixture Matrix
**Temukan sweet spot.** Fitur ini menggabungkan dua faktor utama:
- **Form** — Seberapa bagus performa pemain belakangan ini
- **Fixture** — Seberapa mudah lawan mereka ke depan

Pemain dengan form tinggi DAN fixture mudah diberi skor tertinggi. Tampilan heatmap menunjukkan lawan per GW dengan warna tingkat kesulitan. Bisa pilih rentang 3, 5, atau 8 GW ke depan.

### Ownership & Effective Ownership (EO)
**Kelola risiko ranking kamu.** Fitur ini menunjukkan:
- **Ownership** — Berapa persen manager FPL yang punya pemain ini
- **Effective Ownership** — Estimasi ownership sebenarnya termasuk yang meng-captain-kan
- **Risk Level** — High / Medium / Low

> 💡 **Kenapa ini penting?** Jika pemain dengan EO tinggi cetak banyak poin dan kamu TIDAK punya dia, ranking kamu bisa turun drastis. Sebaliknya, jika kamu punya pemain dengan EO rendah dan dia haul, kamu bisa naik jauh.

---

## 🤖 Fitur Premium — AI (Gemini)

Fitur AI menggunakan **Google Gemini 2.0 Flash** untuk menganalisis data FPL dan memberikan rekomendasi cerdas.

> 🔑 **Cara menggunakan:** Masukkan Gemini API Key kamu di kotak input yang tersedia. Key disimpan di browser kamu dan tidak pernah dikirim ke server kami. Dapatkan API key gratis di [Google AI Studio](https://aistudio.google.com/apikey).

### AI Captain Picks
**Pilih kapten terbaik setiap minggu.** AI menganalisis:
- Form pemain terkini
- Tingkat kesulitan lawan (FDR)
- Keunggulan kandang/tandang
- Expected goals & assists

Hasilnya: 3 rekomendasi kapten — pilihan utama, cadangan, dan differential (yang berani).

### AI Match Predictions
**Prediksi skor pertandingan.** AI mempertimbangkan kekuatan tim (home strength vs away strength) dan FDR untuk memprediksi:
- Skor akhir setiap pertandingan
- Alasan di balik prediksi
- Tingkat kepercayaan (High / Medium / Low)

### GW Summary & Preview
**Ringkasan GW lengkap dari AI.** Menggabungkan semua data penting:
- Transfer trending (masuk & keluar terbanyak)
- Pemain form terbaik
- Jumlah yang cedera
- Tips transfer dan pemain yang harus dipantau

### Transfer Suggestions
**AI bantu rencanakan transfer kamu.** Masukkan budget, lalu AI memberikan:
- Top 3 rekomendasi transfer (jual siapa → beli siapa)
- Opsi murah di bawah £6m
- Pemain premium yang worth it
- One-week punt (pilihan jangka pendek untuk GW ini)

---

*Data bersumber dari FPL API resmi dan diperbarui secara real-time.*
