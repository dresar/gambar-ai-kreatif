<div align="center">

# Gambar AI Kreatif

**Prompt gambar · Analisis gambar · Sertifikat · Perpustakaan — full-stack dengan auth JWT & PostgreSQL**

[![Node](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Hono](https://img.shields.io/badge/API-Hono-E36002?style=flat-square)](https://hono.dev)

</div>

---

## Daftar fitur (lengkap)

Aplikasi web **privat** (login wajib). Semua data dipisah per user di database.

| Modul | Route | Apa yang bisa dilakukan |
|-------|--------|-------------------------|
| **Autentikasi** | `/auth` | Daftar akun baru, login email + password, JWT disimpan di browser |
| **Dashboard** | `/` | Ringkasan akses cepat ke semua modul + statistik jumlah prompt & riwayat |
| **Buat Prompt** | `/buat-prompt` | Pilih parameter & **gaya dari dropdown** (kategori custom), AI menyusun prompt teks panjang untuk generator gambar; simpan ke perpustakaan |
| **Analisis Gambar** | `/analisis-gambar` | Unggah gambar → AI vision → JSON terstruktur (parameter visual, prompt_utama, salin untuk AI gambar); template instruksi custom per user |
| **Generator Sertifikat** | `/generator-sertifikat` | Instruksi + logo (multi-upload) → AI menghasilkan **satu prompt teks panjang** landscape untuk AI gambar sertifikat |
| **Perpustakaan Prompt** | `/perpustakaan` | Daftar semua prompt tersimpan, favorit, cover, filter |
| **Detail Perpustakaan** | `/perpustakaan/:id` | Buka/edit prompt, lihat parameter & riwayat terkait |
| **Pembuat Dropdown** | `/pembuat-dropdown` | CRUD **kategori** & **opsi** dropdown (nama + *prompt fragment*) untuk halaman Buat Prompt — per user |
| **Riwayat Prompt** | `/riwayat` | Riwayat generate/simpan prompt (history) |
| **Profil** | `/profil` | Ubah username/email, ganti password |
| **Tema** | (sidebar) | **Light / Dark** + sidebar collapsible (desktop & mobile sheet) |

### Fitur teknis & UX

| Area | Keterangan |
|------|------------|
| **API** | REST JSON `{ success, data, error }` — auth Bearer JWT |
| **Database** | PostgreSQL (Neon) + Drizzle ORM — users, profiles, prompts, history, dropdown, template analisis, dll. |
| **AI** | Chat completions + **vision** (gambar base64) — konfigurasi via env (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`); retry otomatis jika upstream 502/503 |
| **Deploy** | Frontend Vite + API serverless Vercel (`api/[[...route]].ts`) — same-origin `/api` di production |
| **Privasi** | `robots.txt` Disallow all, meta noindex — tidak untuk indeks publik |

---

## Akun default (setelah seed)

Jalankan **`npm run seed`** sekali (dengan `DATABASE_URL` valid) untuk mengisi user demo + data contoh.

| Field | Nilai default |
|-------|----------------|
| **Email** | `eka@example.com` |
| **Username** | `admin_eka` |
| **Password** | `password123` |

> **Peringatan:** Sandi di atas **hanya untuk development / demo**. Di production, **jangan** mengandalkan user seed — daftar akun sendiri atau hapus/ubah user demo setelah deploy.

---

## Scripts npm

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Frontend **:8080** + API **:5000** (concurrent) |
| `npm run dev:frontend` | Hanya Vite |
| `npm run dev:api` | Hanya API Hono |
| `npm run build` | Build production → folder `dist` |
| `npm run seed` | Seed user demo + dropdown + data contoh |
| `npm run db:push` | Sinkron skema Drizzle ke database |
| `npm run jwt:secret` | Generate **JWT_SECRET** acak (salin ke `.env` / Vercel) |
| `npm run lint` | ESLint |

---

## Variabel lingkungan (ringkas)

| Variable | Wajib | Keterangan |
|----------|--------|------------|
| `DATABASE_URL` | Ya | Connection string PostgreSQL (sslmode=require untuk Neon) |
| `JWT_SECRET` | Ya (prod) | Minimal **32 karakter** di production |
| `VITE_API_URL` | Dev saja | Mis. `http://localhost:5000` — **kosong** di Vercel (same origin) |
| `AI_BASE_URL` | Untuk AI | Base URL chat completions |
| `AI_MODEL` | Untuk AI | Nama model |
| `AI_API_KEY` | Untuk AI | Bearer token |
| `FRONTEND_URL` | Opsional | Origin depan untuk CORS (Vercel) |

Salin dari **`.env.example`** → **`.env`** (lokal). File **`.env` jangan di-commit.**

---

## Quick start

```bash
git clone <repo-anda>
cd gambar-ai-kreatif
cp .env.example .env
# Isi DATABASE_URL, JWT_SECRET, AI_*

npm install
npm run jwt:secret    # opsional: generate JWT
npm run db:push       # skema DB
npm run seed          # user demo + data
npm run dev           # buka http://localhost:8080
```

Login dengan tabel **Akun default** di atas (setelah seed).

---

## Production (Vercel)

1. Set semua env di **Vercel → Settings → Environment Variables** (sama seperti `.env.example`, tanpa `VITE_API_URL` atau kosong).
2. Deploy: build `npm run build`, output **`dist`**.
3. Pastikan **`JWT_SECRET`** production panjang & unik (boleh dari `npm run jwt:secret`).

Detail tambahan ada di komentar dalam **`.env.example`**.

---

## Stack

| Lapisan | Teknologi |
|---------|-----------|
| UI | React 18, React Router, Tailwind, shadcn/ui, Lucide |
| State / UX | TanStack Query, Sonner toast, dark mode |
| Build | Vite 5, TypeScript |
| API | Hono, JWT, bcrypt |
| DB | Drizzle ORM, `pg` (Node) |

---

<div align="center">

**Gambar AI Kreatif** — skripsi / project pribadi · baca lisensi repo jika ada

</div>
