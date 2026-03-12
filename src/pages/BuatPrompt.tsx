import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Save, Sparkles, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export default function BuatPrompt() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [catRes, optRes] = await Promise.all([
        supabase.from("dropdown_categories").select("*").order("sort_order"),
        supabase.from("dropdown_options").select("*").order("sort_order"),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (optRes.data) setOptions(optRes.data);
    };
    load();
  }, [user]);

  const generatedPrompt = useMemo(() => {
    const fragments = Object.entries(selections)
      .map(([catId, optId]) => {
        const opt = options.find((o) => o.id === optId);
        return opt?.prompt_fragment;
      })
      .filter(Boolean);
    return fragments.join(", ");
  }, [selections, options]);

  useEffect(() => {
    if (generatedPrompt) setPromptText(generatedPrompt);
  }, [generatedPrompt]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    toast.success("Prompt disalin ke clipboard!");
  };

  const handleSave = async () => {
    if (!promptText.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("prompts").insert({
      user_id: user.id,
      prompt_text: promptText,
      parameters: selections,
      prompt_type: "image",
    });
    if (error) {
      toast.error("Gagal menyimpan prompt");
    } else {
      // Also save to history
      await supabase.from("prompt_history").insert({
        user_id: user.id,
        prompt_text: promptText,
        parameters: selections,
        prompt_type: "image",
      });
      toast.success("Prompt berhasil disimpan!");
    }
    setSaving(false);
  };

  const optionsForCategory = (catId: string) => options.filter((o) => o.category_id === catId);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Buat Prompt</h1>
        <p className="text-muted-foreground mt-1">Pilih parameter untuk membangun prompt gambar AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image upload + parameters */}
        <div className="lg:col-span-1 space-y-4">
          {/* Image Upload */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Label className="text-sm font-semibold">Referensi Gambar (Opsional)</Label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full rounded-lg object-cover max-h-48" />
                <button
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Klik untuk unggah gambar</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* Parameter Dropdowns */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <Label className="text-sm font-semibold">Parameter Visual</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada kategori dropdown. Buat di halaman{" "}
                <a href="/pembuat-dropdown" className="text-primary hover:underline">Pembuat Dropdown</a>.
              </p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{cat.name}</Label>
                  <Select
                    value={selections[cat.id] || ""}
                    onValueChange={(val) => setSelections((s) => ({ ...s, [cat.id]: val }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={`Pilih ${cat.name.toLowerCase()}`} />
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
              ))
            )}
          </div>
        </div>

        {/* Right: Prompt Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Editor Prompt
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} disabled={!promptText}>
                  <Copy className="h-4 w-4 mr-1" /> Salin
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!promptText || saving} className="gradient-bg">
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Simpan
                </Button>
              </div>
            </div>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Prompt akan muncul di sini saat Anda memilih parameter, atau ketik langsung..."
              className="flex-1 min-h-[300px] font-mono text-sm bg-background resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
