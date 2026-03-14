import { useEffect, useState, useMemo, useCallback } from "react";
import {
  apiGetDropdownCategories,
  apiGetDropdownOptions,
  apiCreatePrompt,
  apiCreatePromptHistory,
  apiAiChat,
  apiAnalyzeImage,
  apiListPromptImageFields,
  apiCreatePromptImageField,
  apiUpdatePromptImageField,
  apiDeletePromptImageField,
  type PromptImageFieldRow,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  Upload,
  X,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Plus,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/copyToClipboard";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Option {
  id: string;
  category_id: string;
  name: string;
  prompt_fragment: string;
}

/** Instruksi tetap ke AI (tanpa textarea panjang di UI). */
const HARDCODE_USER_INSTRUKSI = `Buat JSON prompt gambar AI yang KOMPLEKS dan LENGKAP.
judul = nama di perpustakaan.
prompt_utama = deskripsi visual murni (detail teknis).
salin_untuk_ai_gambar = WAJIB: teks SATU blok siap tempel ke chat AI gambar — diawali kalimat eksplisit meminta AI MEMBUAT GAMBAR lalu seluruh isi prompt_utama (boleh ditambah ringkasan satu kalimat). User akan salin ini ke Midjourney/DALL·E/dll.`;

const SYSTEM_JSON_IMAGE = `Kamu prompt engineer senior untuk generator GAMBAR AI (ilustrasi, scene, konsep visual).
Kembalikan HANYA JSON valid (tanpa markdown, tanpa code fence).

Struktur wajib:
{
  "judul": "string — nama prompt di perpustakaan",
  "ringkasan": "string",
  "aspek": [ { "nama": "string", "deskripsi": "string panjang" } ],
  "parameter_visual": { ... },
  "prompt_utama": "string — deskripsi visual lengkap saja (tanpa kalimat perintah buat gambar di bagian ini)",
  "salin_untuk_ai_gambar": "string WAJIB — format: (1) Baris pembuka eksplisit bahasa Indonesia, misalnya: Buatkan saya sebuah gambar berdasarkan deskripsi berikut. Hasil harus berupa satu gambar yang mengikuti seluruh spesifikasi. (2) Baris kosong. (3) Seluruh isi prompt_utama disalin utuh di sini (boleh sedikit rapikan paragraf). Teks ini yang user salin ke AI gambar agar model paham tugasnya = generate image.",
  "tags": ["string"],
  "catatan_teknis": "string",
  "catatan": "string"
}

salin_untuk_ai_gambar harus bisa dipaste langsung: AI chat membaca dulu perintah buat gambar, lalu deskripsi.

ATURAN DESAIN: prompt_utama profesional, natural, anti look AI generik.
Isi aspek dari parameter user + gaya dropdown.`;

function extractJson(raw: string): string {
  let s = raw.trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) s = m[1].trim();
  return s;
}

const PREFIX_SALIN_AI_GAMBAR =
  "Buatkan saya sebuah gambar berdasarkan deskripsi berikut. Tugas kamu: hasilkan satu gambar yang mengikuti seluruh detail visual, gaya, pencahayaan, dan komposisi yang dijelaskan. Jangan mengabaikan nuansa profesional yang diminta.\n\n--- DESKRIPSI GAMBAR ---\n\n";

function buildSalinUntukAiGambar(parsed: { salin_untuk_ai_gambar?: string; prompt_utama?: string }): string {
  const s = (parsed.salin_untuk_ai_gambar || "").trim();
  if (s.length > 80) return s;
  const pu = (parsed.prompt_utama || "").trim();
  if (!pu) return PREFIX_SALIN_AI_GAMBAR + "(isi prompt_utama di JSON)";
  return PREFIX_SALIN_AI_GAMBAR + pu;
}

export default function BuatPrompt() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paramSearch, setParamSearch] = useState("");
  const [paramPage, setParamPage] = useState(0);

  const [fields, setFields] = useState<PromptImageFieldRow[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [nilaiById, setNilaiById] = useState<Record<string, string>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<PromptImageFieldRow | null>(null);
  const [formJudul, setFormJudul] = useState("");
  const [formPrompting, setFormPrompting] = useState("");
  const [formSort, setFormSort] = useState(0);
  const [savingField, setSavingField] = useState(false);

  const PARAM_PAGE_SIZE = 5;

  const loadFields = useCallback(async () => {
    setFieldsLoading(true);
    try {
      const list = await apiListPromptImageFields();
      setFields(list);
    } catch {
      toast.error("Gagal muat parameter");
    } finally {
      setFieldsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [catData, optData] = await Promise.all([
        apiGetDropdownCategories(),
        apiGetDropdownOptions(),
      ]);
      setCategories(Array.isArray(catData) ? catData : []);
      setOptions(Array.isArray(optData) ? optData : []);
    })();
    loadFields();
  }, [user, loadFields]);

  const generatedPrompt = useMemo(() => {
    return Object.entries(selections)
      .map(([, optId]) => options.find((o) => o.id === optId)?.prompt_fragment)
      .filter(Boolean)
      .join(", ");
  }, [selections, options]);

  const buildParameterBlock = useCallback(() => {
    if (fields.length === 0) return "(belum ada parameter)";
    return fields
      .map((f) => {
        const nilai = (nilaiById[f.id] || "").trim();
        return `• [${f.judul}]\n  Instruksi AI (parameter): ${f.prompting}\n  Isi user: ${nilai || "(kosong)"}`;
      })
      .join("\n\n");
  }, [fields, nilaiById]);

  const handleGenerateAi = async () => {
    const block = buildParameterBlock();
    const instruction = `${HARDCODE_USER_INSTRUKSI}\n\n--- Parameter ---\n${block}\n\n--- Gaya dropdown ---\n${generatedPrompt || "(tidak ada)"}`;

    setGenerating(true);
    setJsonOutput("");
    try {
      let raw: string;
      if (imagePreview) {
        raw = await apiAnalyzeImage(imagePreview, instruction);
      } else {
        const r = await apiAiChat([
          { role: "system", content: SYSTEM_JSON_IMAGE },
          { role: "user", content: instruction + "\n\nOutput JSON saja." },
        ]);
        if (!r?.content) throw new Error("AI kosong");
        raw = r.content;
      }
      const cleaned = extractJson(raw);
      setJsonOutput(cleaned);
      toast.success("Selesai");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
    setGenerating(false);
  };

  const openAdd = () => {
    setEditingField(null);
    setFormJudul("");
    setFormPrompting("");
    setFormSort(fields.length);
    setDialogOpen(true);
  };

  const openEdit = (f: PromptImageFieldRow) => {
    setEditingField(f);
    setFormJudul(f.judul);
    setFormPrompting(f.prompting);
    setFormSort(f.sort_order ?? 0);
    setDialogOpen(true);
  };

  const saveField = async () => {
    const j = formJudul.trim();
    const p = formPrompting.trim();
    if (!j || !p) {
      toast.error("Judul & prompting wajib");
      return;
    }
    setSavingField(true);
    try {
      if (editingField) {
        await apiUpdatePromptImageField(editingField.id, { judul: j, prompting: p, sort_order: formSort });
        toast.success("Diperbarui");
      } else {
        await apiCreatePromptImageField({ judul: j, prompting: p, sort_order: formSort });
        toast.success("Ditambah");
      }
      setDialogOpen(false);
      await loadFields();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
    setSavingField(false);
  };

  const removeField = async (f: PromptImageFieldRow) => {
    if (!confirm(`Hapus "${f.judul}"?`)) return;
    try {
      await apiDeletePromptImageField(f.id);
      setNilaiById((s) => {
        const n = { ...s };
        delete n[f.id];
        return n;
      });
      await loadFields();
    } catch {
      toast.error("Gagal hapus");
    }
  };

  const handleSave = async () => {
    const json = jsonOutput.trim();
    if (!json || !user) {
      toast.error("Isi JSON dulu");
      return;
    }
    let promptText = json;
    let titleSave = "";
    try {
      const p = JSON.parse(extractJson(json)) as {
        prompt_utama?: string;
        judul?: string;
        salin_untuk_ai_gambar?: string;
      };
      promptText = buildSalinUntukAiGambar(p);
      if (p.judul?.trim()) titleSave = p.judul.trim();
    } catch {
      toast.error("JSON tidak valid");
      return;
    }
    if (!titleSave) {
      toast.error('JSON wajib punya "judul"');
      return;
    }
    setSaving(true);
    try {
      await apiCreatePrompt({
        title: titleSave,
        prompt_text: promptText,
        parameters: {
          selections,
          parameter_instruksi: fields.map((f) => ({
            id: f.id,
            judul: f.judul,
            prompting: f.prompting,
            nilai: nilaiById[f.id] || "",
          })),
          json_ai: json,
        },
        prompt_type: "image",
      });
      await apiCreatePromptHistory({ prompt_text: promptText, parameters: { selections }, prompt_type: "image" });
      toast.success("Tersimpan");
    } catch {
      toast.error("Gagal simpan");
    }
    setSaving(false);
  };

  const optionsForCategory = (catId: string) => options.filter((o) => o.category_id === catId);
  const filteredCategories = useMemo(() => {
    if (!paramSearch.trim()) return categories;
    const q = paramSearch.trim().toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, paramSearch]);
  const totalParamPages = Math.max(1, Math.ceil(filteredCategories.length / PARAM_PAGE_SIZE));
  const currentParamPage = Math.min(paramPage, totalParamPages - 1);
  const paginatedCategories = useMemo(() => {
    const start = currentParamPage * PARAM_PAGE_SIZE;
    return filteredCategories.slice(start, start + PARAM_PAGE_SIZE);
  }, [filteredCategories, currentParamPage]);

  const teksSalinAiGambar = useMemo(() => {
    if (!jsonOutput.trim()) return "";
    try {
      const p = JSON.parse(extractJson(jsonOutput)) as {
        salin_untuk_ai_gambar?: string;
        prompt_utama?: string;
      };
      return buildSalinUntukAiGambar(p);
    } catch {
      return "";
    }
  }, [jsonOutput]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 pb-10 sm:space-y-6 sm:px-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Buat Prompt</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Nama simpan = field <code className="rounded bg-muted px-1">judul</code> di JSON.
        </p>
      </div>

      {/* Baris 1: kiri Gaya | kanan Parameter (mobile: stack) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        {/* Kiri — Gaya (dropdown) */}
        <Card className="order-1 flex min-h-0 flex-col lg:order-1">
          <CardHeader className="shrink-0 py-3 pb-2">
            <CardTitle className="text-base">Gaya</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                <a href="/pembuat-dropdown" className="text-primary underline">Atur dropdown</a>
              </p>
            ) : (
              <>
                <Input
                  placeholder="Cari…"
                  value={paramSearch}
                  onChange={(e) => {
                    setParamSearch(e.target.value);
                    setParamPage(0);
                  }}
                  className="h-9 text-sm"
                />
                <div className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto pr-1 sm:max-h-[min(55vh,26rem)]">
                  {paginatedCategories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{cat.name}</Label>
                      <Select value={selections[cat.id] || ""} onValueChange={(v) => setSelections((s) => ({ ...s, [cat.id]: v }))}>
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {optionsForCategory(cat.id).map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                {totalParamPages > 1 && (
                  <div className="flex shrink-0 justify-between text-xs">
                    <Button type="button" variant="outline" size="sm" className="h-8" disabled={currentParamPage === 0} onClick={() => setParamPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="self-center text-muted-foreground">{currentParamPage + 1}/{totalParamPages}</span>
                    <Button type="button" variant="outline" size="sm" className="h-8" disabled={currentParamPage >= totalParamPages - 1} onClick={() => setParamPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Kanan — Parameter */}
        <Card className="order-2 flex min-h-0 flex-col lg:order-2">
          <CardHeader className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 space-y-0 py-3 pb-2">
            <CardTitle className="text-base">Parameter</CardTitle>
            <Button type="button" size="sm" className="gradient-bg h-8 shrink-0" onClick={openAdd}>
              <Plus className="mr-1 h-3 w-3" /> Tambah
            </Button>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-2">
            {fieldsLoading ? (
              <div className="flex justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Muat…
              </div>
            ) : fields.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Kosong — Tambah</p>
            ) : (
              <ul className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto pr-1 sm:max-h-[min(55vh,26rem)]">
                {fields.map((f) => (
                  <li key={f.id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{f.judul}</span>
                      <div className="flex shrink-0 gap-0.5">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 touch-manipulation" onClick={() => openEdit(f)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive touch-manipulation" onClick={() => removeField(f)} aria-label="Hapus">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={nilaiById[f.id] || ""}
                      onChange={(e) => setNilaiById((s) => ({ ...s, [f.id]: e.target.value }))}
                      placeholder="Nilai…"
                      className="h-10 w-full text-sm"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Button type="button" className={cn("h-11 w-full touch-manipulation gradient-bg sm:h-10")} disabled={generating} onClick={handleGenerateAi}>
        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
        Buat JSON
      </Button>

      {/* Baris 2: kiri Gambar | kanan Hasil AI (mobile: stack) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6">
        <Card className="order-1 flex min-h-[220px] flex-col lg:min-h-[320px]">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base">Referensi</CardTitle>
            <p className="text-[11px] font-normal text-muted-foreground">Opsional</p>
          </CardHeader>
          <CardContent className="flex min-h-[180px] flex-1 flex-col lg:min-h-[240px]">
            {imagePreview ? (
              <div className="relative flex flex-1 items-center justify-center rounded-lg border bg-muted/10 p-2">
                <img src={imagePreview} alt="" className="max-h-[min(40vh,280px)] w-full rounded-md object-contain lg:max-h-[min(50vh,360px)]" />
                <Button type="button" variant="secondary" size="sm" className="absolute right-2 top-2 shadow" onClick={() => setImagePreview(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex min-h-[160px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 hover:bg-muted/20 lg:min-h-[240px]">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="px-2 text-center text-xs text-muted-foreground">Ketuk untuk unggah</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onload = () => setImagePreview(r.result as string);
                      r.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="order-2 flex min-h-[280px] flex-col lg:min-h-[320px]">
          <CardHeader className="space-y-1 py-3 pb-2">
            <CardTitle className="text-base">Hasil (JSON)</CardTitle>
            <p className="text-[11px] font-normal text-muted-foreground">Tempel blok biru ke AI gambar.</p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            {teksSalinAiGambar ? (
              <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-primary">Untuk AI gambar</Label>
                  <Button
                    type="button"
                    size="sm"
                    className="relative z-10 h-8 gradient-bg"
                    onClick={async () => {
                      const ok = await copyToClipboard(teksSalinAiGambar);
                      if (ok) toast.success("Disalin");
                      else toast.error("Gagal salin");
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Salin
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={teksSalinAiGambar}
                  className="min-h-[120px] resize-y bg-background font-sans text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ) : null}
            <Label className="text-[11px] text-muted-foreground">JSON</Label>
            <Textarea
              value={jsonOutput}
              onChange={(e) => setJsonOutput(e.target.value)}
              className="min-h-[160px] flex-1 resize-y font-mono text-[11px] sm:min-h-[200px] lg:min-h-[220px]"
              spellCheck={false}
              placeholder='{ "judul": "...", "salin_untuk_ai_gambar": "...", ... }'
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 touch-manipulation sm:h-9" disabled={!jsonOutput.trim()} onClick={async () => { const ok = await copyToClipboard(jsonOutput); if (ok) toast.success("Disalin"); else toast.error("Gagal salin"); }}>
                <Copy className="mr-1 h-3 w-3" /> JSON
              </Button>
              <Button type="button" size="sm" className="h-10 flex-1 touch-manipulation gradient-bg sm:h-9 sm:flex-initial" disabled={!jsonOutput.trim() || saving} onClick={handleSave}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                Simpan Library
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit" : "Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nama</Label>
              <Input value={formJudul} onChange={(e) => setFormJudul(e.target.value)} placeholder="Mood, subjek…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instruksi AI</Label>
              <Textarea value={formPrompting} onChange={(e) => setFormPrompting(e.target.value)} placeholder="…" className="min-h-[88px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Urutan</Label>
              <Input type="number" value={formSort} onChange={(e) => setFormSort(Number(e.target.value) || 0)} className="w-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button className="gradient-bg" disabled={savingField} onClick={saveField}>
              {savingField ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
