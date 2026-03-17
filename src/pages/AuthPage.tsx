import { useState } from "react";
import { apiLogin } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEV_EMAIL = "eka@example.com";
const DEV_PASSWORD = "password123";

/** Production build (npm run build / Vercel): true — sembunyikan login seed. */
const isProduction =
  import.meta.env.PROD ||
  import.meta.env.VITE_APP_MODE === "production";

export default function AuthPage() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, token } = await apiLogin(email, password);
      if (token && typeof token === "string") setAuthToken(token);
      setUser(user);
      toast.success("Berhasil masuk!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      const { user, token } = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
      if (token && typeof token === "string") setAuthToken(token);
      setUser(user);
      toast.success("Masuk (akun demo)");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login demo gagal.";
      toast.error(msg);
      if (import.meta.env.DEV) console.error("Login demo:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="gradient-bg mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Wand2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gambar AI Kreatif
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isProduction
              ? "Masuk dengan email dan kata sandi Anda"
              : "Masuk ke akun (mode pengembangan: ada login cepat di bawah)"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full gradient-bg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            {!isProduction && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-amber-500/50 text-amber-800 dark:text-amber-200 bg-amber-500/5"
                  onClick={handleDevLogin}
                  disabled={loading}
                >
                  Hanya dev: masuk akun seed (npm run seed)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Tombol ini tidak tampil di <strong>production</strong> (build deploy).
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
