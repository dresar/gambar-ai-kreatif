import { useEffect, useState } from "react";
import {
  apiGetDropdownCategories,
  apiGetDropdownOptions,
  apiCreateDropdownCategory,
  apiCreateDropdownOption,
  apiUpdateDropdownCategory,
  apiUpdateDropdownOption,
  apiDeleteDropdownCategory,
  apiDeleteDropdownOption,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ListPlus, ChevronDown, ChevronUp, Save, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Option {
  id: string;
  category_id: string;
  name: string;
  prompt_fragment: string;
  metadata: any;
}

export default function PembuatDropdown() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newOptName, setNewOptName] = useState("");
  const [newOptFragment, setNewOptFragment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editingOptName, setEditingOptName] = useState("");
  const [editingOptFragment, setEditingOptFragment] = useState("");

  const fetchData = async () => {
    if (!user) return;
    try {
      const cats = await apiGetDropdownCategories();
      if (cats && Array.isArray(cats)) {
        setCategories(cats);
        const opts = await apiGetDropdownOptions();
        if (opts && Array.isArray(opts)) {
          const grouped: Record<string, Option[]> = {};
          opts.forEach((o: Option) => {
            if (!grouped[o.category_id]) grouped[o.category_id] = [];
            grouped[o.category_id].push(o);
          });
          setOptions(grouped);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat data";
      toast.error(msg);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const addCategory = async () => {
    if (!newCatName.trim() || !user) return;
    setSaving(true);
    try {
      const slug = newCatName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await apiCreateDropdownCategory({ name: newCatName.trim(), slug });
      toast.success("Kategori ditambahkan!");
      setNewCatName("");
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menambah kategori";
      toast.error(msg);
    }
    setSaving(false);
  };

  const addOption = async (catId: string) => {
    if (!newOptName.trim() || !newOptFragment.trim() || !user) return;
    setSaving(true);
    try {
      await apiCreateDropdownOption({
        category_id: catId,
        name: newOptName.trim(),
        prompt_fragment: newOptFragment.trim(),
      });
      toast.success("Opsi ditambahkan!");
      setNewOptName("");
      setNewOptFragment("");
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menambah opsi";
      toast.error(msg);
    }
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    try {
      await apiDeleteDropdownCategory(id);
      toast.success("Kategori dihapus");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus kategori");
    }
  };

  const deleteOption = async (id: string) => {
    try {
      await apiDeleteDropdownOption(id);
      toast.success("Opsi dihapus");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus opsi");
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveEditCategory = async () => {
    if (!editingCatId || !editingCatName.trim()) return;
    setSaving(true);
    try {
      const slug = editingCatName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await apiUpdateDropdownCategory(editingCatId, { name: editingCatName.trim(), slug });
      toast.success("Kategori diperbarui!");
      setEditingCatId(null);
      setEditingCatName("");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui kategori");
    }
    setSaving(false);
  };

  const startEditOption = (opt: Option) => {
    setEditingOptId(opt.id);
    setEditingOptName(opt.name);
    setEditingOptFragment(opt.prompt_fragment);
  };

  const saveEditOption = async () => {
    if (!editingOptId || !editingOptName.trim() || !editingOptFragment.trim()) return;
    setSaving(true);
    try {
      await apiUpdateDropdownOption(editingOptId, {
        name: editingOptName.trim(),
        prompt_fragment: editingOptFragment.trim(),
      });
      toast.success("Opsi diperbarui!");
      setEditingOptId(null);
      setEditingOptName("");
      setEditingOptFragment("");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui opsi");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ListPlus className="h-6 w-6 text-primary" /> Pembuat Dropdown
        </h1>
        <p className="text-muted-foreground mt-1">Kelola kategori dan opsi dropdown untuk prompt builder</p>
        {!user && (
          <p className="text-amber-600 dark:text-amber-500 mt-2 text-sm">Silakan login untuk menambah atau mengubah data.</p>
        )}
      </div>

      {/* Add category */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <Input
            placeholder="Nama kategori baru (contoh: Pencahayaan)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="bg-background flex-1"
            aria-label="Nama kategori"
          />
          <Button
            type="button"
            onClick={addCategory}
            disabled={saving || !newCatName.trim() || !user}
            className="gradient-bg shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {!user
            ? "Silakan login dulu, lalu isi nama kategori dan klik Tambah."
            : !newCatName.trim()
              ? "Isi nama kategori di atas, lalu klik Tambah."
              : "Klik Tambah untuk menambah kategori."}
        </p>
      </div>

      {/* Categories list */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => !editingCatId && setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {expandedCat === cat.id ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                {editingCatId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="bg-background max-w-xs"
                      placeholder="Nama kategori"
                    />
                    <Button size="sm" onClick={saveEditCategory} disabled={saving || !editingCatName.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingCatId(null); setEditingCatName(""); }}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-card-foreground">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">({(options[cat.id] || []).length} opsi)</span>
                  </>
                )}
              </div>
              {editingCatId !== cat.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startEditCategory(cat); }} className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {expandedCat === cat.id && (
              <div className="border-t border-border p-4 space-y-3 animate-fade-in">
                {(options[cat.id] || []).map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                    {editingOptId === opt.id ? (
                      <div className="flex-1 min-w-0 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingOptName}
                          onChange={(e) => setEditingOptName(e.target.value)}
                          className="bg-background"
                          placeholder="Nama opsi"
                        />
                        <Textarea
                          value={editingOptFragment}
                          onChange={(e) => setEditingOptFragment(e.target.value)}
                          className="bg-background font-mono text-sm"
                          placeholder="Fragment prompt"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditOption} disabled={saving || !editingOptName.trim() || !editingOptFragment.trim()}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                            Simpan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingOptId(null); setEditingOptName(""); setEditingOptFragment(""); }}>
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground">{opt.name}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{opt.prompt_fragment}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => startEditOption(opt)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteOption(opt.id)} className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground">Tambah Opsi Baru</Label>
                  <Input placeholder="Nama opsi" value={newOptName} onChange={(e) => setNewOptName(e.target.value)} className="bg-background" />
                  <Textarea placeholder="Fragment prompt" value={newOptFragment} onChange={(e) => setNewOptFragment(e.target.value)} className="bg-background font-mono text-sm" />
                  <Button size="sm" onClick={() => addOption(cat.id)} disabled={saving || !newOptName.trim() || !newOptFragment.trim() || !user} className="gradient-bg">
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Simpan Opsi
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Belum ada kategori. Buat kategori pertama Anda di atas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
