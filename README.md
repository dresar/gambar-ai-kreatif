# Welcome to your Lovable project

## Unified Monorepo (Hono + Vite + Neon)

Proyek ini memakai **satu root `package.json`**: frontend (Vite + React) dan backend API (Hono) di folder `api/`.

### Instalasi dependency (satu perintah)

```bash
bun add hono @hono/node-server drizzle-orm @neondatabase/serverless bcryptjs jsonwebtoken dotenv && bun add -d drizzle-kit tsx @types/bcryptjs @types/jsonwebtoken
```

Atau dengan npm:

```bash
npm install hono @hono/node-server drizzle-orm @neondatabase/serverless bcryptjs jsonwebtoken dotenv
npm install -D drizzle-kit tsx @types/bcryptjs @types/jsonwebtoken
```

### Variabel lingkungan

Buat file `.env` di root:

```
DATABASE_URL="postgresql://neondb_owner:npg_lbZ1MYaAK3uL@ep-late-term-a1ibnjpk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET=your-secret-key
VITE_API_URL=
```

`VITE_API_URL` kosong agar di development request ke `/api` di-proxy Vite ke backend (port 5000).

### Script

| Script | Deskripsi |
|--------|-----------|
| `bun run dev` | Jalankan frontend Vite (port 8080) |
| `bun run dev:api` | Jalankan backend Hono (port 5000) |
| `bun run seed` | Seed user dummy (eka@example.com / password123) |
| `bun run db:push` | Sinkron skema Drizzle ke Neon |

Jalankan **dua terminal**: `bun run dev` dan `bun run dev:api`. Dev Login memakai kredensial di atas setelah seed dijalankan.

### Menghapus folder `server/` lama

Jika masih ada folder `server/` dari setup sebelumnya, tutup proses yang memakainya (terminal/IDE), lalu hapus manual:

```bash
rm -rf server
```

---

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
