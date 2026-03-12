import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Copy, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GAYA_SERTIFIKAT = [
  { value: "klasik", label: "Klasik", fragment: "classic elegant certificate with ornate gold borders, serif typography, and traditional formal design" },
  { value: "elegan", label: "Elegan", fragment: "sophisticated elegant certificate with subtle gradients, refined typography, and luxurious minimalist aesthetics" },
  { value: "modern-minimal", label: "Modern Minimal", fragment: "modern minimalist certificate with clean lines, sans-serif typography, and contemporary design elements" },
  { value: "formal-akademik", label: "Formal Akademik", fragment: "formal academic certificate with institutional seal, structured layout, and professional academic styling" },
];

export default function GeneratorSertifikat() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    namaPenerima: "",
    judulSertifikat: "",
    namaAcara: "",
    penyelenggara: "",
    tanggal: "",
    lokasi: "",
    gayaVisual: "",
  });
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const updateField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const generatePrompt = () => {
    const style = GAYA_SERTIFIKAT.find((g) => g.value === form.gayaVisual);
    const parts = [
      `Design a professional certificate`,
      style ? `in ${style.fragment} style` : "",
      form.judulSertifikat ? `titled "${form.judulSertifikat}"` : "",
      form.namaPenerima ? `awarded to "${form.namaPenerima}"` : "",
      form.namaAcara ? `for the event "${form.namaAcara}"` : "",
      form.penyelenggara ? `organized by "${form.penyelenggara}"` : "",
      form.tanggal ? `dated ${form.tanggal}` : "",
      form.lokasi ? `held at ${form.lokasi}` : "",
      "high resolution, print-ready quality, photorealistic rendering",
    ].filter(Boolean);
    setPrompt(parts.join(", "));
  };

  const handleSave = async () => {
    if (!prompt || !user) return;
    setSaving(true);
    await supabase.from("prompts").insert({
      user_id: user.id,
      prompt_text: prompt,
      parameters: form,
      prompt_type: "certificate",
    });
    await supabase.from("prompt_history").insert({
      user_id: user.id,
      prompt_text: prompt,
      parameters: form,
      prompt_type: "certificate",
    });
    toast.success("Prompt sertifikat disimpan!");
    setSaving(false);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" /> Generator Sertifikat
        </h1>
        <p className="text-muted-foreground mt-1">Buat prompt desain sertifikat profesional</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Label className="font-semibold">Detail Sertifikat</Label>
          {[
            { key: "namaPenerima", label: "Nama Penerima", placeholder: "Masukkan nama penerima" },
            { key: "judulSertifikat", label: "Judul Sertifikat", placeholder: "Contoh: Sertifikat Penghargaan" },
            { key: "namaAcara", label: "Nama Acara", placeholder: "Contoh: Workshop AI 2026" },
            { key: "penyelenggara", label: "Penyelenggara", placeholder: "Nama organisasi" },
            { key: "tanggal", label: "Tanggal", placeholder: "Contoh: 12 Maret 2026" },
            { key: "lokasi", label: "Lokasi", placeholder: "Kota/tempat acara" },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              <Input
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="bg-background"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gaya Visual</Label>
            <Select value={form.gayaVisual} onValueChange={(v) => updateField("gayaVisual", v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Pilih gaya visual" />
              </SelectTrigger>
              <SelectContent>
                {GAYA_SERTIFIKAT.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generatePrompt} className="w-full gradient-bg">
            Buat Prompt Sertifikat
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Prompt Sertifikat</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(prompt); toast.success("Disalin!"); }} disabled={!prompt}>
                <Copy className="h-4 w-4 mr-1" /> Salin
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!prompt || saving} className="gradient-bg">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Simpan
              </Button>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt sertifikat akan muncul di sini..."
            className="flex-1 min-h-[300px] font-mono text-sm bg-background resize-none"
          />
        </div>
      </div>
    </div>
  );
}
