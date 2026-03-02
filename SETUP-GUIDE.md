# 🔧 Setup Guide: FPL Cache (GitHub Actions + Supabase)

## 1. Dapatkan Supabase Keys

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project kamu
3. Klik **Settings** (⚙️ sidebar kiri bawah) → **API**
4. Catat 2 nilai ini:

| Key | Lokasi |
|---|---|
| **SUPABASE_URL** | Project URL (di bagian atas) |
| **SUPABASE_SERVICE_ROLE_KEY** | Project API Keys → `service_role` → klik **Copy** |

> ⚠️ `service_role` key **bypass RLS** — jangan pernah taruh di frontend/commit ke repo.

---

## 2. Tambahkan GitHub Secrets

1. Buka repo → [github.com/Amarudinn/fpl](https://github.com/Amarudinn/fpl)
2. Klik tab **Settings**
3. Sidebar kiri → **Secrets and variables** → **Actions**
4. Klik **"New repository secret"** untuk masing-masing:

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(paste dari Supabase)* |

---

## 3. Jalankan SQL Schema

Buka Supabase → **SQL Editor** → paste isi file `supabase-fpl-cache.sql` → **Run**

---

## 4. Trigger Workflow Pertama (Manual)

1. Buka repo di GitHub
2. Klik tab **Actions**
3. Di sidebar kiri, pilih **"Update FPL Cache"**
4. Klik tombol **"Run workflow"** → **"Run workflow"** (hijau)
5. Tunggu ~30 detik, cek statusnya ✅

---

## 5. Verifikasi

Buka Supabase → **Table Editor** → tabel `fpl_cache`

Seharusnya ada 3 rows:
- `bootstrap-static` — data pemain, tim, event
- `fixtures` — jadwal pertandingan
- `live_{gw}` — data live gameweek aktif

Setelah ini, workflow berjalan **otomatis tiap 5 menit**. 🎉
