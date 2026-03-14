import { useAuth } from "@/components/AuthProvider";
import { Wand2, Library, History, Sparkles, ScanSearch, ListPlus, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGetStats } from "@/lib/api";

interface Stats {
  totalPrompts: number;
  totalHistory: number;
}

type CardItem = {
  title: string;
  sub: string;
  icon: typeof Wand2;
  href: string;
  gradient: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalPrompts: 0, totalHistory: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await apiGetStats();
      setStats({
        totalPrompts: s.totalPrompts ?? 0,
        totalHistory: s.totalHistory ?? 0,
      });
    })();
  }, [user]);

  const cards: CardItem[] = [
    { title: "Buat", sub: "Prompt gambar", icon: Wand2, href: "/buat-prompt", gradient: "from-primary to-accent" },
    { title: "Analisis", sub: "Gambar → JSON", icon: ScanSearch, href: "/analisis-gambar", gradient: "from-emerald-600 to-primary" },
    { title: "Sertif.", sub: "AI", icon: Sparkles, href: "/generator-sertifikat", gradient: "from-neon-purple to-primary" },
    { title: "Library", sub: `${stats.totalPrompts} item`, icon: Library, href: "/perpustakaan", gradient: "from-neon-blue to-primary" },
    { title: "Riwayat", sub: `${stats.totalHistory}x`, icon: History, href: "/riwayat", gradient: "from-accent to-neon-purple" },
    { title: "Dropdown", sub: "Kategori", icon: ListPlus, href: "/pembuat-dropdown", gradient: "from-primary to-neon-blue" },
    { title: "Profil", sub: "Akun", icon: User, href: "/profil", gradient: "from-slate-500 to-slate-600 dark:from-slate-600 dark:to-slate-700" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-5xl space-y-4 sm:space-y-6 px-0 pb-6">
      <header className="px-1 sm:px-0">
        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl md:text-2xl">
          Halo{user?.username ? `, ${user.username}` : ""}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Tap kartu ↓</p>
      </header>

      <ul
        className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4"
        role="list"
      >
        {cards.map((c) => (
          <li key={c.href} className="min-w-0">
            <Link
              to={c.href}
              className="flex min-h-[4.5rem] flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-[box-shadow,border-color] active:scale-[0.98] sm:min-h-[5.25rem] sm:p-4 hover:border-primary/25 hover:shadow-md"
            >
              <div
                className={`mb-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.gradient} sm:h-9 sm:w-9`}
              >
                <c.icon className="h-4 w-4 text-primary-foreground sm:h-[18px] sm:w-[18px]" aria-hidden />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight text-card-foreground sm:text-base">
                  {c.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground sm:text-xs">
                  {c.sub}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
