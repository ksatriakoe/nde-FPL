# 🌐 Hosting & Cron Compatibility Guide

## Arsitektur FPL Cache (2 Bagian Terpisah)

```
┌─────────────────────────┐     ┌──────────────┐     ┌───────────┐
│  GitHub Actions (cron)  │────▶│   Supabase   │◀────│  Frontend │
│  Fetch FPL tiap 5 min   │     │  fpl_cache   │     │  (hosting) │
└─────────────────────────┘     └──────────────┘     └───────────┘
        (independen)               (cloud DB)         (mana saja)
```

- **GitHub Actions** → hanya butuh repo di GitHub, tidak tergantung hosting
- **Supabase** → cloud database, bisa diakses dari hosting mana saja
- **Frontend** → bisa di-deploy di platform apa saja

---

## Kompatibilitas per Hosting

| Hosting | Frontend | Vercel Proxy | Supabase Fallback | GitHub Actions Cron |
|---|---|---|---|---|
| **Vercel + GitHub** | ✅ | ✅ | ✅ | ✅ |
| **Netlify + GitHub** | ✅ | ❌ perlu konversi ke Netlify Functions | ✅ | ✅ |
| **VPS + GitHub** | ✅ | ❌ perlu setup Express/proxy sendiri | ✅ | ✅ |
| **VPS tanpa GitHub** | ✅ | ❌ | ✅ | ❌ ganti dengan crontab |
| **cPanel + GitHub** | ✅ | ❌ | ✅ | ✅ |
| **cPanel tanpa GitHub** | ✅ | ❌ | ✅ | ❌ ganti dengan cron job cPanel |

---

## Alternatif Cron (Jika Tidak Pakai GitHub)

### Opsi 1: Crontab di VPS/Server
```bash
# Edit crontab
crontab -e

# Tambahkan baris ini (jalankan tiap 5 menit)
*/5 * * * * cd /path/to/project && SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/update-fpl-cache.mjs
```

### Opsi 2: Supabase Edge Functions
Buat cron function langsung di Supabase (gratis).

### Opsi 3: Cloudflare Workers (Cron Trigger)
Gratis, bisa schedule tiap 5 menit.

### Opsi 4: Railway / Render
Background worker gratis untuk menjalankan cron.

---

## Catatan Penting

> Script `scripts/update-fpl-cache.mjs` bisa dijalankan dari **mana saja** — yang penting ada env vars `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.
>
> Frontend selalu baca dari Supabase via `anon key` (public), jadi tidak tergantung tempat cron dijalankan.
