import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  apiCreatePrompt,
  apiCreatePromptHistory,
  apiGetGayaSertifikat,
  apiCreateGayaSertifikat,
  apiUpdateGayaOption,
  apiDeleteGayaOption,
  apiAiChat,
  apiSertifikatDenganLogo,
  type GayaSertifikatItem,
} from "@/lib/api";
import { compressImageFile } from "@/lib/compressImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Bot, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { cn } from "@/lib/utils";

const KALIMAT_PEMBUKA =
  "Buatkan saya gambar sertifikat (satu lembar) berdasarkan deskripsi berikut. Teks pada sertifikat hanya dari isian yang disebut; jangan mengisi field yang tidak disebut.\n\n";

const LOGO_RULES = `LOGO: User melampirkan file logo sebagai referensi. WAJIB tempelkan logo di sertifikat TANPA mengubah bentuk, warna, atau teks pada logo. Desain bingkai/warna sertifikat harus selaras dengan logo.`;

const NO_SIGN_RULE = `TANDA TANGAN: JANGAN menggambar garis tanda tangan, nama penandatangan, stempel basah, atau blok tanda tangan — area tersebut harus kosong/tidak ada.`;

interface FormState {
  namaPenerima: string;
  judulSertifikat: string;
  namaAcara: string;
  penyelenggara: string;
  tanggal: string;
  lokasi: string;
  gayaVisual: string;
  ketentuanAi: string;
}

interface Signer {
  id: string;
  nama: string;
  jabatan: string;
}

interface CustomRow {
  id: string;
  judul: string;
  isi: string;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeIsi(
  f: FormState,
  gaya: GayaSertifikatItem | undefined,
  signers: Signer[],
  includeSign: boolean,
  custom: CustomRow[]
): string {
  const lines: string[] = [];
  if (f.namaPenerima.trim()) lines.push(`Nama penerima: ${f.namaPenerima.trim()}`);
  if (f.judulSertifikat.trim()) lines.push(`Judul sertifikat: ${f.judulSertifikat.trim()}`);
  if (f.namaAcara.trim()) lines.push(`Acara/program: ${f.namaAcara.trim()}`);
  if (f.penyelenggara.trim()) lines.push(`Penyelenggara: ${f.penyelenggara.trim()}`);
  if (f.tanggal.trim()) lines.push(`Tanggal: ${f.tanggal.trim()}`);
  if (f.lokasi.trim()) lines.push(`Lokasi: ${f.lokasi.trim()}`);
  if (gaya?.prompt_fragment) lines.push(`Gaya: ${gaya.name} — ${gaya.prompt_fragment}`);
  custom.forEach((r) => {
    const j = r.judul.trim();
    const i = r.isi.trim();
    if (j && i) lines.push(`${j}: ${i}`);
    else if (i) lines.push(i);
  });
  if (includeSign && signers.some((s) => s.nama.trim())) {
    lines.push("--- Tanda tangan (wajib tampil) ---");
    signers.forEach((s, idx) => {
      if (!s.nama.trim()) return;
      lines.push(`Penandatangan ${idx + 1}: ${s.nama.trim()}${s.jabatan.trim() ? ` — ${s.jabatan.trim()}` : ""}`);
    });
  }
  return lines.join("\n");
}

function buildInstruction(
  isi: string,
  f: FormState,
  includeSign: boolean,
  logoCount: number
): string {
  const parts = [
    KALIMAT_PEMBUKA.trim(),
    "--- Isi (hanya yang diisi user; jangan isi yang kosong) ---",
    isi || "(minimal gaya/ketentuan)",
    f.ketentuanAi.trim() ? `--- Wajib ikuti ---\n${f.ketentuanAi.trim()}` : "",
    logoCount ? LOGO_RULES : "",
    includeSign ? "" : NO_SIGN_RULE,
    "Cetak-minded, tipografi jelas, tidak norak.",
  ].filter(Boolean);
  return parts.join("\n\n");
}

const SYSTEM_AI_SERTIFIKAT_CHAT = `Kamu prompt engineer untuk AI GAMBAR sertifikat. Tugas: ubah data mentah user jadi SATU prompt final SANGAT PANJANG (bukan copy-paste parameter saja).

WAJIB output:
- Mulai: "Buatkan saya gambar sertifikat (format LANDSCAPE / mendatar, bukan portrait) berdasarkan deskripsi berikut."
- Uraikan detail visual: bingkai, margin aman, hierarki teks (judul, nama penerima besar, acara, tanggal, lokasi), tipografi (serif/sans sesuai gaya), tekstur kertas, pencahayaan halus pada kertas.
- Orientasi: tegas LANDSCAPE saja — dilarang layout portrait.
- Anti-AI: tidak norak, tidak banyak warna neon, tidak clipart simetris murahan; estetika percetakan profesional, klasik/modern sesuai gaya user.
- Hanya teks yang user beri; jangan mengarang nama/acara tambahan.
- Jika user minta tanpa tanda tangan: tegas tidak ada blok tanda tangan. Jika ada daftar penandatangan: uraikan posisi garis tanda tangan + nama + jabatan per orang.
- Akhiri dengan ringkasan padat bahasa Inggris untuk model gambar.

Panjang: banyak paragraf naratif, bukan bullet tipis. Tanpa markdown, tanpa JSON.`;

export default function GeneratorSertifikat() {
  const { user } = useAuth();
  const [gayaList, setGayaList] = useState<GayaSertifikatItem[]>([]);
  const [form, setForm] = useState<FormState>({
    namaPenerima: "",
    judulSertifikat: "",
    namaAcara: "",
    penyelenggara: "",
    tanggal: "",
    lokasi: "",
    gayaVisual: "",
    ketentuanAi: "",
  });
  const [logos, setLogos] = useState<{ id: string; dataUrl: string }[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [includeSign, setIncludeSign] = useState(false);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalFragment, setModalFragment] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  const loadGaya = useCallback(async () => {
    const fallback: GayaSertifikatItem[] = [
      { id: "_fb1", name: "Klasik", prompt_fragment: "classic elegant gold serif" },
      { id: "_fb2", name: "Modern minimal", prompt_fragment: "minimal clean sans" },
      { id: "_fb3", name: "Elegan", prompt_fragment: "sophisticated refined" },
      { id: "_fb4", name: "Formal akademik", prompt_fragment: "academic seal professional" },
    ];
    try {
      const list = await apiGetGayaSertifikat();
      setGayaList(list.length ? list : fallback);
    } catch {
      setGayaList(fallback);
    }
  }, []);

  useEffect(() => {
    loadGaya();
  }, [loadGaya]);

  const selectedGaya = gayaList.find((g) => g.id === form.gayaVisual);

  const onPickLogos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setLogoLoading(true);
    try {
      const next: { id: string; dataUrl: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        if (logos.length + next.length >= 12) {
          toast.message("Maks 12 logo per generate");
          break;
        }
        const f = files[i];
        if (!f.type.startsWith("image/")) continue;
        const dataUrl = await compressImageFile(f, 720, 0.82);
        next.push({ id: uid(), dataUrl });
      }
      setLogos((L) => [...L, ...next]);
      if (next.length) toast.success(`${next.length} logo`);
    } catch {
      toast.error("Gagal unggah");
    }
    setLogoLoading(false);
    e.target.value = "";
  };

  /** Hanya gabungan parameter — bukan hasil AI. */
  const generateLokal = () => {
    const isi = mergeIsi(form, selectedGaya, signers, includeSign, customRows);
    const body = [
      KALIMAT_PEMBUKA.trim(),
      isi || "(hanya gaya/ketentuan)",
      logos.length ? `${LOGO_RULES}\n(User punya ${logos.length} logo — tempel file logo ke AI bersama prompt ini.)` : "",
      includeSign ? "" : NO_SIGN_RULE,
      form.ketentuanAi.trim() ? `Wajib: ${form.ketentuanAi.trim()}` : "",
      "Orientasi: LANDSCAPE (mendatar).",
    ]
      .filter(Boolean)
      .join("\n\n");
    setPrompt(body);
    toast.message("Ringkas = tanpa AI");
  };

  /** Utama: selalu pakai AI supaya prompt panjang & dioptimalkan. */
  const generateDenganAi = async () => {
    const isi = mergeIsi(form, selectedGaya, signers, includeSign, customRows);
    if (!isi.trim() && !form.ketentuanAi.trim() && !selectedGaya && !logos.length) {
      toast.error("Isi form / ketentuan / gaya / logo dulu");
      return;
    }
    const instruction = buildInstruction(isi, form, includeSign, logos.length);
    const userPesan = `${instruction}

TUGAS: Tulis ulang menjadi SATU prompt gambar yang SANGAT PANJANG dan diperkaya (boleh 15–40 kalimat naratif). Jangan hanya mengulang bullet di atas. Jelaskan tata letak landscape, ornamen, font, ruang kosong, dan cara logo dipasang. Hormati ketentuan tambahan user. ${includeSign ? "Sertakan blok tanda tangan sesuai daftar." : "Tanpa blok tanda tangan."}`;

    setAiLoading(true);
    try {
      if (logos.length) {
        const content = await apiSertifikatDenganLogo({
          instruction: userPesan + "\n\nWAJIB: perluas jadi prompt naratif panjang; jangan output pendek.",
          logos: logos.map((l) => l.dataUrl),
        });
        setPrompt(content.trim());
        toast.success("AI + logo — prompt diperkaya");
      } else {
        const r = await apiAiChat([
          { role: "system", content: SYSTEM_AI_SERTIFIKAT_CHAT },
          { role: "user", content: userPesan },
        ]);
        let t = r?.content?.trim() || "";
        if (!t) throw new Error("AI kosong — cek AI_API_KEY");
        if (!t.includes("LANDSCAPE") && !t.toLowerCase().includes("landscape") && !t.toLowerCase().includes("mendatar")) {
          t = t + "\n\nOrientasi wajib: LANDSCAPE (mendatar), bukan portrait.";
        }
        setPrompt(t);
        toast.success("AI selesai — prompt diperkaya");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal AI");
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!prompt || !user) return;
    setSaving(true);
    try {
      await apiCreatePrompt({
        prompt_text: prompt,
        parameters: {
          ...form,
          gayaNama: selectedGaya?.name,
          logoCount: logos.length,
          includeSign,
          signers,
          customRows,
        } as unknown as Record<string, unknown>,
        prompt_type: "certificate",
      });
      await apiCreatePromptHistory({ prompt_text: prompt, parameters: {}, prompt_type: "certificate" });
      toast.success("Disimpan");
    } catch {
      toast.error("Gagal");
    }
    setSaving(false);
  };

  const fields: { key: keyof FormState; label: string; ph: string }[] = [
    { key: "namaPenerima", label: "Nama penerima", ph: "Kosong = jangan tampilkan nama" },
    { key: "judulSertifikat", label: "Judul", ph: "Kosong = jangan isi judul" },
    { key: "namaAcara", label: "Acara", ph: "Opsional" },
    { key: "penyelenggara", label: "Penyelenggara", ph: "Opsional" },
    { key: "tanggal", label: "Tanggal", ph: "Opsional" },
    { key: "lokasi", label: "Lokasi", ph: "Opsional" },
  ];

  return (
    <div className="max-w-5xl space-y-4 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          Sertifikat AI
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          <Sparkles className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-primary" aria-hidden />
          <strong>AI</strong> = prompt panjang.
          <Bot className="inline h-3.5 w-3.5 mx-1 align-text-bottom opacity-70" aria-hidden />
          <strong>Ringkas</strong> = gabung teks (bukan AI).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Label className="font-semibold text-sm">Logo (banyak, max 12)</Label>
          <div className="flex flex-wrap gap-2">
            {logos.map((l) => (
              <div key={l.id} className="relative h-14 w-14 rounded border bg-muted">
                <img src={l.dataUrl} alt="" className="h-full w-full object-contain" />
                <button type="button" className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground" onClick={() => setLogos((x) => x.filter((y) => y.id !== l.id))}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded border border-dashed">
              {logoLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Sparkles className="h-5 w-5 text-primary opacity-80" aria-hidden />}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickLogos} disabled={logoLoading || logos.length >= 12} />
            </label>
          </div>

          <Label className="font-semibold text-sm">Detail</Label>
          {fields.map(({ key, label, ph }) => (
            <div key={key} className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input placeholder={ph} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="h-8 bg-background text-sm" />
            </div>
          ))}

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <Checkbox id="sign" checked={includeSign} onCheckedChange={(c) => setIncludeSign(!!c)} />
            <label htmlFor="sign" className="text-sm">Sertifikat ber-tanda tangan</label>
          </div>
          {includeSign ? (
            <div className="space-y-2 rounded-md bg-muted/30 p-2">
              {signers.map((s, i) => (
                <div key={s.id} className="flex flex-wrap gap-1 items-end">
                  <Input placeholder={`Nama ${i + 1}`} value={s.nama} onChange={(e) => setSigners((x) => x.map((y) => (y.id === s.id ? { ...y, nama: e.target.value } : y)))} className="h-8 flex-1 min-w-[100px] bg-background text-sm" />
                  <Input placeholder="Jabatan" value={s.jabatan} onChange={(e) => setSigners((x) => x.map((y) => (y.id === s.id ? { ...y, jabatan: e.target.value } : y)))} className="h-8 flex-1 min-w-[80px] bg-background text-sm" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => setSigners((x) => x.filter((y) => y.id !== s.id))} aria-label="Hapus"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSigners((x) => [...x, { id: uid(), nama: "", jabatan: "" }])}>
                <Bot className="h-3 w-3 mr-1 opacity-80" /> + ttd
              </Button>
            </div>
          ) : null}

          <Label className="font-semibold text-sm pt-1">Parameter tambahan</Label>
          {customRows.map((r) => (
            <div key={r.id} className="flex flex-wrap gap-1 items-end">
              <Input placeholder="Judul baris" value={r.judul} onChange={(e) => setCustomRows((x) => x.map((y) => (y.id === r.id ? { ...y, judul: e.target.value } : y)))} className="h-8 w-[28%] min-w-[72px] bg-background text-sm" />
              <Input placeholder="Isi" value={r.isi} onChange={(e) => setCustomRows((x) => x.map((y) => (y.id === r.id ? { ...y, isi: e.target.value } : y)))} className="h-8 flex-1 min-w-[100px] bg-background text-sm" />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setCustomRows((x) => x.filter((y) => y.id !== r.id))} aria-label="Hapus"><X className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCustomRows((x) => [...x, { id: uid(), judul: "", isi: "" }])}>
            <Sparkles className="h-3 w-3 mr-1 opacity-70" /> + baris
          </Button>

          <div className="space-y-1">
            <Label className="text-xs">Gaya</Label>
            <div className="flex gap-1">
              <Select value={form.gayaVisual} onValueChange={(v) => setForm((f) => ({ ...f, gayaVisual: v }))}>
                <SelectTrigger className="h-8 flex-1 bg-background text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {gayaList.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" className="h-8 w-8 shrink-0" variant="outline" onClick={() => { setEditId(null); setModalName(""); setModalFragment(""); setModalOpen(true); }} aria-label="Gaya baru"><Sparkles className="h-4 w-4 text-primary" /></Button>
            </div>
            <div className="max-h-16 overflow-y-auto text-[10px] text-muted-foreground space-y-0.5">
              {gayaList.filter((g) => !g.id.startsWith("_fb")).map((g) => (
                <div key={g.id} className="flex justify-between items-center">
                  <span className="truncate">{g.name}</span>
                  <span className="flex gap-0.5">
                    <button type="button" className="underline" onClick={() => { setEditId(g.id); setModalName(g.name); setModalFragment(g.prompt_fragment); setModalOpen(true); }}>Edit</button>
                    <button type="button" className="text-destructive underline" onClick={async () => { try { await apiDeleteGayaOption(g.id); if (form.gayaVisual === g.id) setForm((f) => ({ ...f, gayaVisual: "" })); loadGaya(); } catch { toast.error("Gagal"); } }}>Hapus</button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Textarea placeholder="Instruksi AI (ops.)" value={form.ketentuanAi} onChange={(e) => setForm((f) => ({ ...f, ketentuanAi: e.target.value }))} className="min-h-[56px] text-sm bg-background" />

          <div className="flex flex-col gap-2">
            <Button type="button" className="gradient-bg h-10" disabled={aiLoading} onClick={generateDenganAi}>
              {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI{logos.length ? ` · ${logos.length} logo` : ""}
            </Button>
            <Button type="button" variant="outline" className="h-8 text-xs gap-1" disabled={aiLoading} onClick={generateLokal}>
              <Bot className="h-3.5 w-3.5 opacity-70" /> Ringkas
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex justify-between">
            <Label className="font-semibold text-sm">Prompt</Label>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" className="h-8" disabled={!prompt} onClick={async () => { const ok = await copyToClipboard(prompt); if (ok) toast.success("Disalin"); else toast.error("Gagal"); }}><Sparkles className="h-3 w-3 mr-1 opacity-80" />Salin</Button>
              <Button type="button" size="sm" className="h-8 gradient-bg" disabled={!prompt || saving} onClick={handleSave}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}Simpan</Button>
            </div>
          </div>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className={cn("min-h-[320px] text-sm bg-background")} spellCheck={false} />
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Gaya"}</DialogTitle></DialogHeader>
          <Input className="bg-background" value={modalName} onChange={(e) => setModalName(e.target.value)} placeholder="Nama" />
          <Textarea className="bg-background min-h-[72px] text-sm" value={modalFragment} onChange={(e) => setModalFragment(e.target.value)} placeholder="Fragment" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="button" disabled={modalSaving} onClick={async () => {
              if (!modalName.trim() || !modalFragment.trim()) return;
              setModalSaving(true);
              try {
                if (editId) await apiUpdateGayaOption(editId, { name: modalName, prompt_fragment: modalFragment });
                else await apiCreateGayaSertifikat({ name: modalName, prompt_fragment: modalFragment });
                setModalOpen(false);
                loadGaya();
              } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
              setModalSaving(false);
            }}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
