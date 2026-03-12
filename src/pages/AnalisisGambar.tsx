import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, ScanSearch, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function AnalisisGambar() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageData) return;
    setLoading(true);
    // This will use the configured AI endpoint from settings
    // For now, show placeholder
    setAnalysis("Fitur analisis gambar memerlukan konfigurasi endpoint AI di halaman Pengaturan. Setelah dikonfigurasi, gambar akan dianalisis secara otomatis menggunakan API AI yang terhubung.");
    setLoading(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analisis Gambar</h1>
        <p className="text-muted-foreground mt-1">Unggah gambar untuk dianalisis dan diubah menjadi prompt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <Label className="text-sm font-semibold">Unggah Gambar</Label>
          {imageData ? (
            <div className="relative">
              <img src={imageData} alt="Upload" className="w-full rounded-lg object-cover max-h-64" />
              <button
                onClick={() => { setImageData(null); setAnalysis(""); }}
                className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-12 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Klik atau seret gambar ke sini</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          )}
          {imageData && (
            <Button onClick={handleAnalyze} disabled={loading} className="w-full gradient-bg">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-2" />}
              Analisis Gambar
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Hasil Analisis</Label>
            {analysis && (
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(analysis); toast.success("Disalin!"); }}>
                <Copy className="h-4 w-4 mr-1" /> Salin
              </Button>
            )}
          </div>
          <Textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            placeholder="Hasil analisis akan muncul di sini..."
            className="min-h-[250px] font-mono text-sm bg-background resize-none"
          />
        </div>
      </div>
    </div>
  );
}
