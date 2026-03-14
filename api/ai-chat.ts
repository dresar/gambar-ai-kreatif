/**
 * Pemanggilan custom AI (chat completions). Konfigurasi dari .env.
 * Endpoint harus: https://one.apprentice.cyou/api/v1/chat/completions
 */
const AI_BASE_URL = process.env.AI_BASE_URL || "https://one.apprentice.cyou/api/v1";
const AI_MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const AI_API_KEY = process.env.AI_API_KEY || "";

function getChatCompletionsUrl(): string {
  const base = (AI_BASE_URL || "").trim().replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 502/503 dari upstream (server sibuk) — bukan bug app kita. */
function upstreamBusyMessage(status: number, errText: string): string {
  const html = errText.includes("<!DOCTYPE") || errText.includes("503");
  if (status === 503 || status === 502 || html) {
    return `Layanan AI sedang sibuk atau tidak tersedia (${status}). Coba lagi beberapa menit — ini dari server AI upstream, bukan dari aplikasi Anda.`;
  }
  return `AI request gagal (${status}): ${errText.length > 400 ? errText.slice(0, 400) + "…" : errText}`;
}

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export async function chatCompletions(messages: ChatMessage[]): Promise<{ content: string } | null> {
  const url = getChatCompletionsUrl();
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY belum dikonfigurasi di .env");
  }
  const maxAttempts = Number(process.env.AI_RETRY_ATTEMPTS) || 3;
  let lastErr = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
      }),
    });
    const errText = await res.text();
    if (res.ok) {
      let data: { choices?: Array<{ message?: { content?: string } }> };
      try {
        data = JSON.parse(errText) as typeof data;
      } catch {
        throw new Error(`Respons AI bukan JSON: ${errText.slice(0, 200)}`);
      }
      const content = data?.choices?.[0]?.message?.content ?? null;
      return content ? { content } : null;
    }
    lastErr = errText;
    if ((res.status === 503 || res.status === 502) && attempt < maxAttempts) {
      await sleep(1500 * attempt);
      continue;
    }
    throw new Error(upstreamBusyMessage(res.status, errText));
  }
  throw new Error(upstreamBusyMessage(503, lastErr));
}

export type VisionMessage = {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
};

export async function chatCompletionsWithImage(messages: VisionMessage[]): Promise<{ content: string } | null> {
  const url = getChatCompletionsUrl();
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY belum dikonfigurasi di .env");
  }
  const maxAttempts = Number(process.env.AI_RETRY_ATTEMPTS) || 3;
  const timeout = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 120_000;
  let lastErr = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
      }),
      signal: AbortSignal.timeout(timeout),
    });
    const errText = await res.text();
    if (res.ok) {
      let data: { choices?: Array<{ message?: { content?: string } }> };
      try {
        data = JSON.parse(errText) as typeof data;
      } catch {
        throw new Error(`Respons AI bukan JSON: ${errText.slice(0, 200)}`);
      }
      const content = data?.choices?.[0]?.message?.content ?? null;
      return content ? { content } : null;
    }
    lastErr = errText;
    if (res.status === 503 || res.status === 502) {
      console.warn("[ai-chat vision] retry", attempt, res.status);
    } else {
      console.error("[ai-chat vision]", res.status, errText.slice(0, 300));
    }
    if ((res.status === 503 || res.status === 502) && attempt < maxAttempts) {
      await sleep(2000 * attempt);
      continue;
    }
    throw new Error(upstreamBusyMessage(res.status, errText));
  }
  throw new Error(upstreamBusyMessage(503, lastErr));
}

/** Wajib dimasukkan ke prompt_utama / instruksi agar output tidak kelihatan generik buatan AI. */
const PROMPT_ANTIAI_PROFESIONAL = `
WAJIB untuk prompt_utama (gabung ke teks prompt): hasil harus terasa profesional dan buatan manusia/estudio, BUKAN khas render AI generik.
Hindari: oversaturated neon, plastic skin, terlalu mulus seperti CGI 2010, simetri sempurna berlebihan, glow berlebihan, watermark vibe AI.
Utamakan: tekstur alami (kertas, kain, grain foto ringan), pencahayaan believable, bayangan konsisten, palet warna matang, detail organik kecil (tidak steril), komposisi seperti fotografer/desainer nyata, bisa sebut medium (foto analog feel, ilustrasi editorial, cetak tradisional) jika cocok.
prompt_utama harus panjang, berlapis, dan eksplisit soal kualitas cetak / tampilan profesional tanpa terlihat "template AI".`;

const ANALISIS_GAMBAR_SYSTEM_PROMPT = `Kamu menganalisis gambar untuk prompt generator gambar AI. Kembalikan HANYA satu objek JSON valid (tanpa markdown, tanpa code fence).

Struktur JSON:
{
  "judul": "string",
  "ringkasan": "string",
  "parameter": {
    "gaya_visual": { "nilai": "string", "deskripsi": "string" },
    "pencahayaan": { "nilai": "string", "deskripsi": "string" },
    "komposisi": { "nilai": "string", "deskripsi": "string" },
    "mood": { "nilai": "string", "deskripsi": "string" },
    "palet_warna": { "nilai": "string", "deskripsi": "string" },
    "subjek_utama": { "nilai": "string", "deskripsi": "string" },
    "latar_belakang": { "nilai": "string", "deskripsi": "string" }
  },
  "prompt_utama": "string — deskripsi recreate gambar, detail, anti-AI-generik",
  "salin_untuk_ai_gambar": "WAJIB — bahasa Indonesia: buka dengan kalimat eksplisit minta AI MEMBUAT GAMBAR dari deskripsi berikut, lalu tempel seluruh prompt_utama (user akan copy-paste ke AI gambar)",
  "tags": ["string"],
  "kategori": "string",
  "catatan_edit": "string"
}
${PROMPT_ANTIAI_PROFESIONAL}
Hanya JSON mentah.`;

export async function analyzeImageToPromptJson(imageDataUrl: string, userInstruction?: string): Promise<string> {
  if (!AI_API_KEY?.trim()) {
    throw new Error("AI_API_KEY belum dikonfigurasi di .env — isi untuk analisis gambar");
  }
  // Gambar tidak disimpan di server; hanya dikirim sebagai base64 (data URL) ke AI.
  const url = ensureImageDataUrl(imageDataUrl);
  const base =
    (userInstruction || "").trim() ||
    "Analisis gambar ini; JSON lengkap; prompt_utama agar recreate mirip referensi.";
  const extra = `${base}\n\n${PROMPT_ANTIAI_PROFESIONAL}`;
  const messages: VisionMessage[] = [
    { role: "system", content: ANALISIS_GAMBAR_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: extra },
        { type: "image_url", image_url: { url } },
      ],
    },
  ];
  const result = await chatCompletionsWithImage(messages);
  if (!result?.content?.trim()) throw new Error("Tidak ada respons dari AI");
  return result.content.trim();
}

const SYSTEM_SERTIFIKAT_LOGO = `Kamu membantu membuat SATU prompt teks SANGAT PANJANG untuk AI generator GAMBAR sertifikat (bukan ringkasan parameter).
User melampirkan logo. Aturan:
1) Logo: tampil UTUH tanpa ubah bentuk/warna/teks; desain sertifikat selaras logo.
2) Orientasi: WAJIB LANDSCAPE (mendatar / A4 landscape). Larang portrait vertikal.
3) Tanda tangan: ikuti instruksi user (kosong vs daftar nama).
4) Jangan isi field yang user tidak beri.
5) Perluas jadi prompt kaya: tipografi per blok, margin, tekstur kertas, ornamen, pencahayaan, cetak 300dpi mindset, hindari look AI generik (norak, glow, clipart).
Output HANYA teks prompt. Buka "Buatkan saya gambar sertifikat…" lalu minimal banyak paragraf padat (bukan daftar bullet tipis).`;

/** Satu request vision: teks + banyak gambar logo. */
export async function certificatePromptWithLogos(instructionText: string, logoDataUrls: string[]): Promise<string> {
  if (!AI_API_KEY?.trim()) throw new Error("AI_API_KEY belum dikonfigurasi");
  const urls = logoDataUrls.slice(0, 12).map((u) => ensureImageDataUrl(u));
  const parts: ContentPart[] = [
    {
      type: "text",
      text:
        (instructionText || "").trim() +
        `\n\n--- LOGO DILAMPIRKAN (${urls.length} gambar, urutan sesuai lampiran) ---\nIntegrasikan semua logo sesuai aturan sistem. Panjang prompt besar.`,
    },
  ];
  for (const url of urls) {
    parts.push({ type: "image_url", image_url: { url } });
  }
  const messages: VisionMessage[] = [
    { role: "system", content: SYSTEM_SERTIFIKAT_LOGO },
    { role: "user", content: parts },
  ];
  const result = await chatCompletionsWithImage(messages);
  if (!result?.content?.trim()) throw new Error("Tidak ada respons dari AI");
  return result.content.trim();
}

/** Pastikan string adalah data URL gambar (base64) yang bisa dibaca API. */
function ensureImageDataUrl(input: string): string {
  const s = (input || "").trim();
  if (s.startsWith("data:image/") && s.includes("base64,")) return s;
  if (s.startsWith("data:")) return s;
  const base64 = s.replace(/^data:[^;]+;base64,/, "");
  if (/^[A-Za-z0-9+/=]+$/.test(base64)) {
    return `data:image/png;base64,${base64}`;
  }
  return s;
}
