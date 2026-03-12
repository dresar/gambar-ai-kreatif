import { useEffect, useState } from "react";
import { apiGetPromptTemplates } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  prompt_fragment: string | null;
}

export default function TemplatePrompt() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    apiGetPromptTemplates().then((data) => {
      setTemplates(Array.isArray(data) ? data : []);
    });
  }, [user]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Template Prompt</h1>
        <p className="text-muted-foreground mt-1">Template siap pakai untuk berbagai kebutuhan</p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada template. Template akan tersedia setelah Anda membuatnya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-elevated transition-shadow">
              <div>
                <span className="text-xs rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">{t.category}</span>
              </div>
              <h3 className="font-semibold text-card-foreground">{t.name}</h3>
              {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
              <Button variant="outline" size="sm" className="mt-auto" onClick={() => navigate("/buat-prompt")}>
                Gunakan <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
