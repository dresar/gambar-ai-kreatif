import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export default function Pengaturan() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [aiEndpoint, setAiEndpoint] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setAiEndpoint(data.ai_endpoint_url || "");
          setAiModel(data.ai_model_name || "");
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      ai_endpoint_url: aiEndpoint || null,
      ai_model_name: aiModel || null,
      theme_preference: theme,
    }).eq("user_id", user.id);
    if (error) toast.error("Gagal menyimpan pengaturan");
    else toast.success("Pengaturan disimpan!");
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Pengaturan
        </h1>
        <p className="text-muted-foreground mt-1">Konfigurasi preferensi dan integrasi AI</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <Label className="font-semibold">Tampilan</Label>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tema</Label>
          <Select value={theme} onValueChange={(v: "dark" | "light") => setTheme(v)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-4 w-4" /> Gelap</div></SelectItem>
              <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-4 w-4" /> Terang</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <Label className="font-semibold">Integrasi AI</Label>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">URL Endpoint AI</Label>
          <Input
            placeholder="https://api.example.com/v1/chat/completions"
            value={aiEndpoint}
            onChange={(e) => setAiEndpoint(e.target.value)}
            className="bg-background font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Nama Model</Label>
          <Input
            placeholder="gpt-4-vision-preview"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="bg-background font-mono text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Kunci API disimpan secara aman di konfigurasi lingkungan server dan tidak pernah terekspos di antarmuka.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gradient-bg">
        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Simpan Pengaturan
      </Button>
    </div>
  );
}
