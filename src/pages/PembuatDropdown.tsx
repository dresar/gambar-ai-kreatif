import { useEffect, useState } from "react";
import {
  apiGetDropdownCategories,
  apiGetDropdownOptions,
  apiCreateDropdownCategory,
  apiCreateDropdownOption,
  apiDeleteDropdownCategory,
  apiDeleteDropdownOption,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ListPlus, ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
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

  const fetchData = async () => {
    if (!user) return;
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
  };

  useEffect(() => { fetchData(); }, [user]);

  const addCategory = async () => {
    if (!newCatName.trim() || !user) return;
    setSaving(true);
    try {
      const slug = newCatName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await apiCreateDropdownCategory({ name: newCatName, slug });
      toast.success("Kategori ditambahkan!");
      setNewCatName("");
      fetchData();
    } catch {
      toast.error("Gagal menambah kategori");
    }
    setSaving(false);
  };

  const addOption = async (catId: string) => {
    if (!newOptName.trim() || !newOptFragment.trim() || !user) return;
    setSaving(true);
    try {
      await apiCreateDropdownOption({
        category_id: catId,
        name: newOptName,
        prompt_fragment: newOptFragment,
      });
      toast.success("Opsi ditambahkan!");
      setNewOptName("");
      setNewOptFragment("");
      fetchData();
    } catch {
      toast.error("Gagal menambah opsi");
    }
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    await apiDeleteDropdownCategory(id);
    toast.success("Kategori dihapus");
    fetchData();
  };

  const deleteOption = async (id: string) => {
    await apiDeleteDropdownOption(id);
    toast.success("Opsi dihapus");
    fetchData();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ListPlus className="h-6 w-6 text-primary" /> Pembuat Dropdown
        </h1>
        <p className="text-muted-foreground mt-1">Kelola kategori dan opsi dropdown untuk prompt builder</p>
      </div>

      {/* Add category */}
      <div className="rounded-xl border border-border bg-card p-4 flex gap-3">
        <Input
          placeholder="Nama kategori baru (contoh: Pencahayaan)"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="bg-background"
        />
        <Button onClick={addCategory} disabled={saving || !newCatName.trim()} className="gradient-bg shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </div>

      {/* Categories list */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            >
              <div className="flex items-center gap-3">
                {expandedCat === cat.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="font-semibold text-card-foreground">{cat.name}</span>
                <span className="text-xs text-muted-foreground">({(options[cat.id] || []).length} opsi)</span>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {expandedCat === cat.id && (
              <div className="border-t border-border p-4 space-y-3 animate-fade-in">
                {(options[cat.id] || []).map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">{opt.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{opt.prompt_fragment}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteOption(opt.id)} className="h-8 w-8 text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs text-muted-foreground">Tambah Opsi Baru</Label>
                  <Input placeholder="Nama opsi" value={newOptName} onChange={(e) => setNewOptName(e.target.value)} className="bg-background" />
                  <Textarea placeholder="Fragment prompt" value={newOptFragment} onChange={(e) => setNewOptFragment(e.target.value)} className="bg-background font-mono text-sm" />
                  <Button size="sm" onClick={() => addOption(cat.id)} disabled={saving || !newOptName.trim() || !newOptFragment.trim()} className="gradient-bg">
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
