import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, StarOff, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Prompt {
  id: string;
  title: string | null;
  prompt_text: string;
  tags: string[];
  is_favorite: boolean;
  prompt_type: string;
  created_at: string;
}

export default function PerpustakaanPrompt() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const fetchPrompts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPrompts(data);
  };

  useEffect(() => { fetchPrompts(); }, [user]);

  const toggleFav = async (id: string, current: boolean) => {
    await supabase.from("prompts").update({ is_favorite: !current }).eq("id", id);
    fetchPrompts();
  };

  const deletePrompt = async (id: string) => {
    await supabase.from("prompts").delete().eq("id", id);
    toast.success("Prompt dihapus");
    fetchPrompts();
  };

  const filtered = prompts.filter((p) => {
    const matchSearch = p.prompt_text.toLowerCase().includes(search.toLowerCase()) ||
      (p.title?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchFilter = filter === "all" || p.is_favorite;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perpustakaan Prompt</h1>
        <p className="text-muted-foreground mt-1">Koleksi semua prompt yang telah Anda simpan</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari prompt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Semua</Button>
          <Button variant={filter === "favorites" ? "default" : "outline"} size="sm" onClick={() => setFilter("favorites")}>
            <Star className="h-4 w-4 mr-1" /> Favorit
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Belum ada prompt tersimpan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {p.title && <h3 className="font-semibold text-sm text-card-foreground">{p.title}</h3>}
                  <p className="text-sm text-muted-foreground font-mono line-clamp-2">{p.prompt_text}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggleFav(p.id, p.is_favorite)} className="h-8 w-8">
                    {p.is_favorite ? <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(p.prompt_text); toast.success("Disalin!"); }} className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deletePrompt(p.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-secondary px-2 py-0.5">{p.prompt_type}</span>
                <span>{new Date(p.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
