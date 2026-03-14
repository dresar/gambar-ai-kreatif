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
import { getAuthToken } from "@/lib/auth";
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
  sort_order?: number;
}

interface Option {
  id: string;
  category_id: string;
  name: string;
  prompt_fragment: string;
  sort_order?: number;
  metadata: any;
}

export default function PembuatDropdown() {
  const { user } = useAuth();
  const hasAuth = !!user || !!getAuthToken();
  // Tombol Tambah tidak pakai hasAuth untuk disabled: halaman ini hanya bisa dibuka kalau sudah login (ProtectedRoutes)
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatUrutan, setNewCatUrutan] = useState("");
  const [newOptName, setNewOptName] = useState("");
  const [newOptFragment, setNewOptFragment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatUrutan, setEditingCatUrutan] = useState("");
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editingOptName, setEditingOptName] = useState("");
  const [editingOptFragment, setEditingOptFragment] = useState("");
  const [editingOptUrutan, setEditingOptUrutan] = useState("");

  const fetchData = async () => {
    if (!hasAuth) return;
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
          Object.keys(grouped).forEach((k) => {
            grouped[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          });
          setOptions(grouped);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat data";
      toast.error(msg);
    }
  };

  useEffect(() => { fetchData(); }, [user, hasAuth]);

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) {
      toast.message("Isi kolom nama kategori (bukan hanya ID urutan), lalu klik Tambah.");
      return;
    }
    setSaving(true);
    try {
      let slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!slug) slug = `kategori-${Date.now()}`;
      const u = parseInt(newCatUrutan.trim(), 10);
      await apiCreateDropdownCategory({
        name,
        slug,
        ...(Number.isFinite(u) && u >= 1 ? { sort_order: u } : {}),
      });
      toast.success("Kategori ditambahkan!");
      setNewCatName("");
      setNewCatUrutan("");
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menambah kategori";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const addOption = async (catId: string) => {
    if (!newOptName.trim() || !newOptFragment.trim()) return;
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
    setEditingCatUrutan(String(cat.sort_order ?? 1));
  };

  const saveEditCategory = async () => {
    if (!editingCatId || !editingCatName.trim()) return;
    setSaving(true);
    try {
      const slug = editingCatName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const u = parseInt(editingCatUrutan.trim(), 10);
      await apiUpdateDropdownCategory(editingCatId, {
        name: editingCatName.trim(),
        slug,
        sort_order: Number.isFinite(u) && u >= 1 ? u : 1,
      });
      toast.success("Kategori diperbarui!");
      setEditingCatId(null);
      setEditingCatName("");
      setEditingCatUrutan("");
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
    setEditingOptUrutan(String(opt.sort_order ?? 1));
  };

  const saveEditOption = async () => {
    if (!editingOptId || !editingOptName.trim() || !editingOptFragment.trim()) return;
    setSaving(true);
    try {
      const u = parseInt(editingOptUrutan.trim(), 10);
      await apiUpdateDropdownOption(editingOptId, {
        name: editingOptName.trim(),
        prompt_fragment: editingOptFragment.trim(),
        sort_order: Number.isFinite(u) && u >= 1 ? u : 1,
      });
      toast.success("Opsi diperbarui!");
      setEditingOptId(null);
      setEditingOptName("");
      setEditingOptFragment("");
      setEditingOptUrutan("");
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
        {!hasAuth && (
          <p className="text-amber-600 dark:text-amber-500 mt-2 text-sm">Silakan login untuk menambah atau mengubah data.</p>
        )}
      </div>

      {/* Add category */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void addCategory();
          }}
        >
          <div className="space-y-1 w-24 shrink-0">
            <Label htmlFor="dropdown-cat-urutan" className="text-xs text-muted-foreground">
              ID urutan
            </Label>
            <Input
              id="dropdown-cat-urutan"
              type="number"
              min={1}
              placeholder="Auto"
              value={newCatUrutan}
              onChange={(e) => setNewCatUrutan(e.target.value)}
              className="bg-background h-9"
              title="Opsional. Kosong = otomatis paling belakang"
            />
          </div>
          <div className="flex-1 min-w-[12rem] space-y-1">
            <Label htmlFor="dropdown-cat-nama" className="text-xs text-muted-foreground">
              Nama kategori <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dropdown-cat-nama"
              placeholder="Wajib: mis. Pencahayaan, Gaya visual"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="bg-background h-9"
              aria-label="Nama kategori"
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            disabled={saving || !newCatName.trim()}
            className="gradient-bg shrink-0 relative z-10 cursor-pointer touch-manipulation"
            aria-label="Tambah kategori"
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          {!hasAuth
            ? "Silakan login dulu."
            : "Tombol Tambah aktif setelah nama kategori diisi. Pastikan API jalan (port 5000) dan halaman dibuka lewat dev server (proxy /api)."}
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
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground shrink-0">ID</span>
                    <Input
                      type="number"
                      min={1}
                      value={editingCatUrutan}
                      onChange={(e) => setEditingCatUrutan(e.target.value)}
                      className="bg-background w-16 h-9"
                    />
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="bg-background max-w-xs flex-1"
                      placeholder="Nama kategori"
                    />
                    <Button size="sm" onClick={saveEditCategory} disabled={saving || !editingCatName.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingCatId(null); setEditingCatName(""); setEditingCatUrutan(""); }}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-primary/15 px-2 text-xs font-bold text-primary">
                      {cat.sort_order ?? "—"}
                    </span>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Label className="text-xs">ID</Label>
                          <Input
                            type="number"
                            min={1}
                            value={editingOptUrutan}
                            onChange={(e) => setEditingOptUrutan(e.target.value)}
                            className="bg-background w-16 h-9"
                          />
                          <Input
                            value={editingOptName}
                            onChange={(e) => setEditingOptName(e.target.value)}
                            className="bg-background flex-1 min-w-[8rem]"
                            placeholder="Nama opsi"
                          />
                        </div>
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
                          <Button size="sm" variant="ghost" onClick={() => { setEditingOptId(null); setEditingOptName(""); setEditingOptFragment(""); setEditingOptUrutan(""); }}>
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                          {opt.sort_order ?? "—"}
                        </span>
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
                  <Button size="sm" onClick={() => addOption(cat.id)} disabled={saving || !newOptName.trim() || !newOptFragment.trim()} className="gradient-bg relative z-10 cursor-pointer">
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
