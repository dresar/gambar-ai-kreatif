import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiGetPrompt, apiUpdatePrompt, apiDeletePrompt } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Copy,
  Star,
  StarOff,
  Trash2,
  Save,
  Loader2,
  Award,
  ImageIcon,
  FileJson,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { cn } from "@/lib/utils";

type PromptRow = {
  id: string;
  title: string | null;
  prompt_text: string;
  parameters?: Record<string, unknown>;
  tags: string[];
  is_favorite: boolean;
  prompt_type: string;
  created_at: string;
  cover_image?: string | null;
};

function isCertificate(p: PromptRow) {
  return (p.prompt_type || "").toLowerCase() === "certificate";
}

/** Sampul default cantik (tanpa gambar user). */
function DefaultCover({ type }: { type: "certificate" | "image" }) {
  const cert = type === "certificate";
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br p-8 text-white",
        cert ? "from-amber-900/90 via-amber-800/80 to-stone-900" : "from-violet-900/90 via-primary/80 to-slate-900"
      )}
    >
      {cert ? <Award className="h-16 w-16 opacity-90 drop-shadow-lg" /> : <Sparkles className="h-16 w-16 opacity-90 drop-shadow-lg" />}
      <span className="text-center text-sm font-medium tracking-wide opacity-95">
        {cert ? "Sertifikat" : "Prompt gambar"}
      </span>
      <span className="text-[10px] uppercase tracking-widest opacity-70">Belum ada sampul</span>
    </div>
  );
}

function ParamKV({ k, v }: { k: string; v: unknown }) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="text-xs font-semibold text-primary">{k}</p>
        <pre className="mt-1 max-h-48 overflow-auto text-[11px] leading-relaxed">{JSON.stringify(v, null, 2)}</pre>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 border-b border-border/40 py-2 last:border-0">
      <span className="min-w-[100px] text-xs font-medium text-muted-foreground">{k}</span>
      <span className="flex-1 text-sm">{String(v)}</span>
    </div>
  );
}

export default function PerpustakaanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<PromptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverDraft, setCoverDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await apiGetPrompt(id);
      const p = {
        id: String(d.id),
        title: (d.title as string) ?? null,
        prompt_text: String(d.prompt_text ?? ""),
        parameters: (d.parameters as Record<string, unknown>) ?? {},
        tags: (d.tags as string[]) ?? [],
        is_favorite: !!d.is_favorite,
        prompt_type: String(d.prompt_type ?? "image"),
        created_at: String(d.created_at ?? ""),
        cover_image: (d.cover_image as string) || null,
      };
      setRow(p);
      setCoverDraft(p.cover_image?.startsWith("http") ? p.cover_image : "");
    } catch {
      toast.error("Tidak ditemukan");
      navigate("/perpustakaan");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading || !row) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const cert = isCertificate(row);
  const params = row.parameters ?? {};
  const jsonAi = params.json_ai as string | undefined;

  const saveCoverUrl = async () => {
    setSaving(true);
    try {
      const url = coverDraft.trim();
      await apiUpdatePrompt(row.id, { cover_image: url || null });
      setRow((r) => (r ? { ...r, cover_image: url || null } : r));
      toast.success("Sampul diperbarui");
    } catch {
      toast.error("Gagal");
    }
    setSaving(false);
  };

  const uploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const data = r.result as string;
      try {
        await apiUpdatePrompt(row.id, { cover_image: data });
        setRow((x) => (x ? { ...x, cover_image: data } : x));
        setCoverDraft("");
        toast.success("Sampul diunggah");
      } catch {
        toast.error("Gagal");
      }
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/perpustakaan">
            <ArrowLeft className="h-4 w-4" /> Perpustakaan
          </Link>
        </Button>
        <Badge variant={cert ? "default" : "secondary"} className={cn("gap-1", cert && "bg-amber-600 hover:bg-amber-600")}>
          {cert ? <Award className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
          {cert ? "Sertifikat" : "Prompt gambar / AI"}
        </Badge>
        {row.is_favorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : null}
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="relative aspect-[21/9] min-h-[180px] w-full sm:aspect-[2.5/1]">
          {row.cover_image ? (
            <img src={row.cover_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <DefaultCover type={cert ? "certificate" : "image"} />
          )}
        </div>
        <div className="space-y-1 border-t border-border bg-card/95 p-5 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{row.title?.trim() || "Tanpa judul"}</h1>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sampul</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="URL gambar…" value={coverDraft} onChange={(e) => setCoverDraft(e.target.value)} className="text-sm" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={saving || !coverDraft.trim()} onClick={saveCoverUrl}>
                <Save className="mr-1 h-3 w-3" /> Simpan URL
              </Button>
              <label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Unggah
                <input type="file" accept="image/*" className="hidden" onChange={uploadCover} />
              </label>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const ok = await copyToClipboard(row.prompt_text);
                  if (ok) toast.success("Prompt akhir disalin");
                  else toast.error("Gagal");
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Salin prompt akhir
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  await apiUpdatePrompt(row.id, { is_favorite: !row.is_favorite });
                  setRow((r) => (r ? { ...r, is_favorite: !r.is_favorite } : r));
                  toast.success("Favorit diperbarui");
                }}
              >
                {row.is_favorite ? <Star className="mr-1 h-3 w-3 fill-amber-400" /> : <StarOff className="mr-1 h-3 w-3" />}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (!confirm("Hapus entri ini?")) return;
                  apiDeletePrompt(row.id).then(() => {
                    toast.success("Dihapus");
                    navigate("/perpustakaan");
                  });
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Parameter asli */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-4 w-4 text-primary" />
                Parameter saat disimpan
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {cert ? "Data form sertifikat & lainnya (apa adanya dari DB)." : "Dropdown, parameter Buat Prompt, JSON AI (jika ada)."}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {cert ? (
                <div className="rounded-xl bg-muted/30 p-4">
                  {Object.entries(params).map(([k, v]) => {
                    if (k === "json_ai") return null;
                    return <ParamKV key={k} k={k} v={v} />;
                  })}
                  {Object.keys(params).filter((k) => k !== "json_ai").length === 0 && (
                    <p className="text-sm text-muted-foreground">Tidak ada parameter tersimpan.</p>
                  )}
                </div>
              ) : (
                <>
                  {params.selections != null && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-semibold text-primary">Pilihan dropdown (ID)</p>
                      <pre className="mt-1 text-[11px]">{JSON.stringify(params.selections, null, 2)}</pre>
                    </div>
                  )}
                  {Array.isArray(params.parameter_instruksi) && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-semibold text-primary">Parameter instruksi (judul + nilai)</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {(params.parameter_instruksi as { judul?: string; nilai?: string }[]).map((x, i) => (
                          <li key={i} className="border-b border-border/50 pb-2 last:border-0">
                            <span className="font-medium">{x.judul}</span>
                            {x.nilai ? <span className="text-muted-foreground"> — {x.nilai}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {jsonAi ? (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-violet-600 dark:text-violet-400">JSON hasil AI (mentah)</Label>
                      <Textarea readOnly value={jsonAi} className="min-h-[200px] font-mono text-[11px]" spellCheck={false} />
                    </div>
                  ) : null}
                  {Object.keys(params).filter((k) => !["selections", "parameter_instruksi", "json_ai"].includes(k)).length > 0 && (
                    <div className="rounded-lg border p-3">
                      <p className="mb-2 text-xs font-semibold">Lainnya</p>
                      {Object.entries(params)
                        .filter(([k]) => !["selections", "parameter_instruksi", "json_ai"].includes(k))
                        .map(([k, v]) => (
                          <ParamKV key={k} k={k} v={v} />
                        ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Prompt akhir */}
          <Card className="border-primary/20 bg-gradient-to-b from-card to-muted/20 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Hasil akhir prompting
              </CardTitle>
              <p className="text-xs text-muted-foreground">Teks yang dipakai untuk AI gambar / generator.</p>
            </CardHeader>
            <CardContent>
              <Textarea value={row.prompt_text} onChange={(e) => setRow((r) => (r ? { ...r, prompt_text: e.target.value } : r))} className="min-h-[280px] font-sans text-sm leading-relaxed" spellCheck={false} />
              <Button
                type="button"
                className="mt-3 gradient-bg"
                size="sm"
                onClick={async () => {
                  try {
                    await apiUpdatePrompt(row.id, { prompt_text: row.prompt_text });
                    toast.success("Prompt disimpan");
                  } catch {
                    toast.error("Gagal");
                  }
                }}
              >
                <Save className="mr-1 h-3 w-3" /> Simpan perubahan teks
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
