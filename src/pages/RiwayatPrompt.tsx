import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, History } from "lucide-react";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  prompt_text: string;
  prompt_type: string;
  created_at: string;
}

export default function RiwayatPrompt() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from("prompt_history").select("*").order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const deleteItem = async (id: string) => {
    await supabase.from("prompt_history").delete().eq("id", id);
    toast.success("Riwayat dihapus");
    fetchHistory();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6 text-primary" /> Riwayat Prompt
        </h1>
        <p className="text-muted-foreground mt-1">Daftar semua prompt yang pernah Anda buat</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Belum ada riwayat prompt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-card-foreground line-clamp-3">{item.prompt_text}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-secondary px-2 py-0.5">{item.prompt_type}</span>
                    <span>{new Date(item.created_at).toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(item.prompt_text); toast.success("Disalin!"); }} className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
