import { useState } from "react";
import { apiLogin, apiSignUp } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEV_EMAIL = "eka@example.com";
const DEV_PASSWORD = "password123";

export default function AuthPage() {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { user, token } = await apiLogin(email, password);
        setAuthToken(token);
        setUser(user);
        toast.success("Berhasil masuk!");
      } else {
        const { user, token } = await apiSignUp(email, password);
        setAuthToken(token);
        setUser(user);
        toast.success("Pendaftaran berhasil!");
      }
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
      setAuthToken(token);
      setUser(user);
      toast.success("Dev login berhasil!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Dev login gagal. Pastikan server API jalan dan data seed sudah dijalankan.");
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
            AI Prompt Generator
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "Masuk ke akun Anda" : "Buat akun baru"}
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
              {isLogin ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground border-dashed"
              onClick={handleDevLogin}
              disabled={loading}
            >
              Dev Login (Auto Login)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
