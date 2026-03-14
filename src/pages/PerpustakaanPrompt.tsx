import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetPrompts, apiUpdatePrompt } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Star, StarOff, Award, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Prompt {
  id: string;
  title: string | null;
  prompt_text: string;
  parameters?: Record<string, unknown>;
  tags: string[];
  is_favorite: boolean;
  prompt_type: string;
  created_at: string;
  cover_image?: string | null;
}

function GridCover({ p }: { p: Prompt }) {
  const cert = (p.prompt_type || "").toLowerCase() === "certificate";
  if (p.cover_image) {
    return <img src={p.cover_image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />;
  }
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br p-4 text-white",
        cert ? "from-amber-900/95 via-amber-800 to-stone-900" : "from-violet-900/95 via-primary to-slate-900"
      )}
    >
      {cert ? <Award className="h-12 w-12 opacity-95 drop-shadow-md sm:h-14 sm:w-14" /> : <ImageIcon className="h-12 w-12 opacity-95 sm:h-14 sm:w-14" />}
      <span className="text-center text-[10px] font-semibold uppercase tracking-wider opacity-90">{cert ? "Sertifikat" : "Gambar"}</span>
    </div>
  );
}

export default function PerpustakaanPrompt() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const fetchPrompts = async () => {
    if (!user) return;
    const data = await apiGetPrompts();
    setPrompts((Array.isArray(data) ? data : []) as Prompt[]);
  };

  useEffect(() => {
    fetchPrompts();
  }, [user]);

  const toggleFav = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    await apiUpdatePrompt(id, { is_favorite: !current });
    fetchPrompts();
    toast.success("Favorit");
  };

  const filtered = prompts.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.prompt_text.toLowerCase().includes(q) || (p.title?.toLowerCase().includes(q) ?? false);
    const matchFilter = filter === "all" || p.is_favorite;
    return matchSearch && matchFilter;
  });

  const displayTitle = (p: Prompt) => p.title?.trim() || "Tanpa judul";

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Perpustakaan Prompt</h1>
        <p className="text-sm text-muted-foreground">Ketuk kartu untuk halaman detail lengkap — sertifikat & prompt gambar dipisah.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari judul atau isi prompt…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setFilter("all")}>
            Semua
          </Button>
          <Button variant={filter === "favorites" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setFilter("favorites")}>
            <Star className="mr-1 h-4 w-4" /> Favorit
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-20 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada prompt</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => {
            const cert = (p.prompt_type || "").toLowerCase() === "certificate";
            return (
              <li key={p.id}>
                <Link
                  to={`/perpustakaan/${p.id}`}
                  className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <GridCover p={p} />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow-md backdrop-blur-sm transition hover:bg-background"
                      onClick={(e) => toggleFav(e, p.id, p.is_favorite)}
                      aria-label="Favorit"
                    >
                      {p.is_favorite ? (
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <Badge
                      className={cn(
                        "absolute bottom-2 left-2 text-[10px] font-semibold shadow",
                        cert ? "border-0 bg-amber-600 hover:bg-amber-600" : "bg-violet-600 hover:bg-violet-600"
                      )}
                    >
                      {cert ? "Sertifikat" : "Gambar"}
                    </Badge>
                  </div>
                  <div className="border-t border-border/60 bg-card p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{displayTitle(p)}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID") : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
