import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  apiCreatePrompt,
  apiCreatePromptHistory,
  apiGetGayaSertifikat,
  apiCreateGayaSertifikat,
  apiUpdateGayaOption,
  apiDeleteGayaOption,
  type GayaSertifikatItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Award, Copy, Save, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  namaPenerima: string;
  judulSertifikat: string;
  namaAcara: string;
  penyelenggara: string;
  tanggal: string;
  lokasi: string;
  gayaVisual: string;
}

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
  });
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalFragment, setModalFragment] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  const loadGaya = async () => {
    try {
      const list = await apiGetGayaSertifikat();
      setGayaList(list);
    } catch {
      setGayaList([]);
    }
  };

  useEffect(() => {
    loadGaya();
  }, []);

  const updateField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectedGaya = gayaList.find((g) => g.id === form.gayaVisual);

  const generatePrompt = () => {
    const parts = [
      "Design a professional certificate",
      selectedGaya ? `in ${selectedGaya.prompt_fragment} style` : "",
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
    try {
      await apiCreatePrompt({
        prompt_text: prompt,
        parameters: form as unknown as Record<string, unknown>,
        prompt_type: "certificate",
      });
      await apiCreatePromptHistory({
        prompt_text: prompt,
        parameters: form as unknown as Record<string, unknown>,
        prompt_type: "certificate",
      });
      toast.success("Prompt sertifikat disimpan!");
    } catch {
      toast.error("Gagal menyimpan");
    }
    setSaving(false);
  };

  const openAddModal = () => {
    setEditId(null);
    setModalName("");
    setModalFragment("");
    setModalOpen(true);
  };

  const openEditModal = (g: GayaSertifikatItem) => {
    setEditId(g.id);
    setModalName(g.name);
    setModalFragment(g.prompt_fragment);
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (!modalName.trim() || !modalFragment.trim()) {
      toast.error("Nama gaya dan prompt fragment wajib");
      return;
    }
    setModalSaving(true);
    try {
      if (editId) {
        await apiUpdateGayaOption(editId, { name: modalName, prompt_fragment: modalFragment });
        toast.success("Gaya diperbarui");
      } else {
        await apiCreateGayaSertifikat({ name: modalName, prompt_fragment: modalFragment });
        toast.success("Gaya ditambahkan");
      }
      setModalOpen(false);
      loadGaya();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    }
    setModalSaving(false);
  };

  const handleDeleteGaya = async (id: string) => {
    try {
      await apiDeleteGayaOption(id);
      toast.success("Gaya dihapus");
      if (form.gayaVisual === id) updateField("gayaVisual", "");
      loadGaya();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const fields: { key: keyof FormState; label: string; placeholder: string }[] = [
    { key: "namaPenerima", label: "Nama Penerima", placeholder: "Masukkan nama penerima" },
    { key: "judulSertifikat", label: "Judul Sertifikat", placeholder: "Contoh: Sertifikat Penghargaan" },
    { key: "namaAcara", label: "Nama Acara", placeholder: "Contoh: Workshop AI 2026" },
    { key: "penyelenggara", label: "Penyelenggara", placeholder: "Nama organisasi" },
    { key: "tanggal", label: "Tanggal", placeholder: "Contoh: 12 Maret 2026" },
    { key: "lokasi", label: "Lokasi", placeholder: "Kota/tempat acara" },
  ];

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
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="bg-background"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Gaya Visual</Label>
              <Button type="button" variant="ghost" size="sm" onClick={openAddModal} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Select value={form.gayaVisual} onValueChange={(v) => updateField("gayaVisual", v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Pilih gaya visual" />
              </SelectTrigger>
              <SelectContent>
                {gayaList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gayaList.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <span>Kelola:</span>
                {gayaList.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate">{g.name}</span>
                    <span className="flex gap-0.5 shrink-0">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditModal(g)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteGaya(g.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={generatePrompt} className="w-full gradient-bg">
            Buat Prompt Sertifikat
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Prompt Sertifikat</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(prompt);
                  toast.success("Disalin!");
                }}
                disabled={!prompt}
              >
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Gaya Visual" : "Tambah Gaya Visual"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Gaya</Label>
              <Input
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                placeholder="Contoh: Retro Gold"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt Fragment</Label>
              <Textarea
                value={modalFragment}
                onChange={(e) => setModalFragment(e.target.value)}
                placeholder="Contoh: retro style, gold colors, vintage border"
                className="bg-background font-mono text-sm min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleModalSubmit} disabled={modalSaving}>
              {modalSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
