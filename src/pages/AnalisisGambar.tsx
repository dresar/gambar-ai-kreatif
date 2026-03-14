import { useState, useEffect, useCallback } from "react";
import {
  apiAnalyzeImage,
  apiCreatePrompt,
  apiListAnalisisInstruksi,
  apiCreateAnalisisInstruksi,
  apiUpdateAnalisisInstruksi,
  apiDeleteAnalisisInstruksi,
  apiGetAiConfig,
  type AnalisisInstruksiRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  X,
  ScanSearch,
  Loader2,
  Copy,
  Save,
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  Sparkles,
  FileJson,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { cn } from "@/lib/utils";

const FALLBACK_INSTRUCTION =
  "Tolong analisis gambar ini dan buatkan prompting supaya desainnya sama atau sangat mirip saat di-generate ulang dengan AI gambar.";

function downscaleDataUrl(dataUrl: string, maxSide: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSide && height <= maxSide) {
        resolve(dataUrl);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxSide) / width);
        width = maxSide;
      } else {
        width = Math.round((width * maxSide) / height);
        height = maxSide;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = dataUrl;
  });
}

function extractJsonFromResponse(raw: string): string {
  let s = raw.trim();
  const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) s = codeBlock[1].trim();
  return s;
}

export default function AnalisisGambar() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [instruction, setInstruction] = useState(FALLBACK_INSTRUCTION);
  const [compressBeforeSend, setCompressBeforeSend] = useState(true);

  const [templates, setTemplates] = useState<AnalisisInstruksiRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnalisisInstruksiRow | null>(null);
  const [formJudul, setFormJudul] = useState("");
  const [formInstruksi, setFormInstruksi] = useState("");
  const [formSort, setFormSort] = useState(0);
  const [savingInstruksi, setSavingInstruksi] = useState(false);
  const [aiKeyOk, setAiKeyOk] = useState<boolean | null>(null);

  useEffect(() => {
    apiGetAiConfig()
      .then((c) => setAiKeyOk(c.key_configured))
      .catch(() => setAiKeyOk(null));
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const list = await apiListAnalisisInstruksi();
      setTemplates(list);
    } catch {
      toast.error("Gagal memuat template instruksi");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreate = () => {
    setEditing(null);
    setFormJudul("");
    setFormInstruksi("");
    setFormSort(templates.length);
    setDialogOpen(true);
  };

  const openEdit = (t: AnalisisInstruksiRow) => {
    setEditing(t);
    setFormJudul(t.judul);
    setFormInstruksi(t.instruksi);
    setFormSort(t.sort_order ?? 0);
    setDialogOpen(true);
  };

  const saveInstruksiForm = async () => {
    const j = formJudul.trim();
    const i = formInstruksi.trim();
    if (!j || !i) {
      toast.error("Judul dan instruksi wajib");
      return;
    }
    setSavingInstruksi(true);
    try {
      if (editing) {
        await apiUpdateAnalisisInstruksi(editing.id, { judul: j, instruksi: i, sort_order: formSort });
        toast.success("Template diperbarui");
      } else {
        await apiCreateAnalisisInstruksi({ judul: j, instruksi: i, sort_order: formSort });
        toast.success("Template ditambah");
      }
      setDialogOpen(false);
      await loadTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
    setSavingInstruksi(false);
  };

  const removeTemplate = async (t: AnalisisInstruksiRow) => {
    if (!confirm(`Hapus template "${t.judul}"?`)) return;
    try {
      await apiDeleteAnalisisInstruksi(t.id);
      toast.success("Dihapus");
      if (instruction === t.instruksi) setInstruction(FALLBACK_INSTRUCTION);
      await loadTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal hapus");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageData) return;
    setLoading(true);
    setAnalysis("");
    try {
      let toSend = imageData;
      if (compressBeforeSend) {
        try {
          toSend = await downscaleDataUrl(imageData, 1400, 0.82);
        } catch {
          toSend = imageData;
        }
      }
      const jsonString = await apiAnalyzeImage(toSend, instruction.trim() || undefined);
      setAnalysis(extractJsonFromResponse(jsonString));
      toast.success("Analisis selesai.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menganalisis gambar");
    }
    setLoading(false);
  };

  const handleSaveAsTemplate = async () => {
    if (!analysis.trim()) {
      toast.error("Belum ada hasil analisis.");
      return;
    }
    setSavingTemplate(true);
    try {
      const cleaned = extractJsonFromResponse(analysis);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cleaned) as Record<string, unknown>;
      } catch {
        toast.error("Hasil bukan JSON valid.");
        setSavingTemplate(false);
        return;
      }
      await apiCreatePrompt({
        title: (parsed.judul as string) || "Dari analisis gambar",
        prompt_text: String(parsed.prompt_utama || parsed.ringkasan || analysis).slice(0, 50_000),
        parameters: parsed,
        tags: ["analisis-gambar"],
        prompt_type: "image",
      });
      toast.success("Disimpan ke Perpustakaan Prompt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
    setSavingTemplate(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analisis Gambar</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {aiKeyOk === true && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
              AI siap
            </span>
          )}
          {aiKeyOk === false && (
            <span
              className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-amber-800 dark:text-amber-200"
              title=".env hanya dibaca oleh proses API (bukan Vite)."
            >
              AI_API_KEY + restart API
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-5">
          <Card className="overflow-hidden border-border shadow-sm">
            <CardHeader className="border-b border-border/60 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-primary" />
                Gambar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {imageData ? (
                <div className="relative bg-muted/30">
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img src={imageData} alt="Referensi" className="h-full w-full object-contain" />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-3 top-3 h-8 shadow-md"
                    onClick={() => {
                      setImageData(null);
                      setAnalysis("");
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Ganti
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 hover:bg-muted/20">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Unggah gambar</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              )}

              {/* Template instruksi — langsung di bawah area gambar */}
              <div className="border-t border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Template</h3>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={openCreate}>
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah
                  </Button>
                </div>
                {templatesLoading ? (
                  <div className="flex justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Muat…
                  </div>
                ) : templates.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Kosong — Tambah</p>
                ) : (
                  <ul className="max-h-[220px] space-y-1.5 overflow-y-auto rounded-lg border border-border/60 bg-muted/10 p-2">
                    {templates.map((t) => (
                      <li
                        key={t.id}
                        className="group flex items-stretch gap-2 rounded-md border border-transparent bg-background/80 px-2 py-2 text-sm transition-colors hover:border-border hover:bg-background"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{t.judul}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {t.instruksi}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-border/50 pl-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] font-medium text-primary hover:text-primary"
                            onClick={() => setInstruction(t.instruksi)}
                          >
                            Gunakan
                          </Button>
                          <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeTemplate(t)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 border-t border-border p-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={compressBeforeSend}
                    onChange={(e) => setCompressBeforeSend(e.target.checked)}
                    className="rounded border-border"
                  />
                  Kompres
                </label>
                <Button
                  className={cn("h-10 w-full gradient-bg")}
                  disabled={!imageData || loading}
                  onClick={handleAnalyze}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                  Analisis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: instruksi + output */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border/60 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Instruksi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Instruksi ke AI…"
                className="min-h-[140px] text-sm"
              />
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 py-3 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-4 w-4" />
                JSON
              </CardTitle>
              {analysis ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={async () => {
                      const ok = await copyToClipboard(analysis);
                      if (ok) toast.success("Disalin");
                      else toast.error("Gagal salin");
                    }}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Salin
                  </Button>
                  <Button size="sm" className="h-8 gradient-bg" disabled={savingTemplate} onClick={handleSaveAsTemplate}>
                    {savingTemplate ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Simpan
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                placeholder="Hasil…"
                className="min-h-[320px] font-mono text-xs leading-relaxed md:min-h-[380px]"
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "Template baru"}</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Judul</Label>
              <Input value={formJudul} onChange={(e) => setFormJudul(e.target.value)} placeholder="Nama" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Instruksi</Label>
              <Textarea value={formInstruksi} onChange={(e) => setFormInstruksi(e.target.value)} className="min-h-[120px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Urut</Label>
              <Input type="number" value={formSort} onChange={(e) => setFormSort(Number(e.target.value) || 0)} className="w-20" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveInstruksiForm} disabled={savingInstruksi} className="gradient-bg">
              {savingInstruksi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
