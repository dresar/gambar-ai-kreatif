import { useAuth } from "@/components/AuthProvider";
import { Wand2, Library, History, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGetStats } from "@/lib/api";

interface Stats {
  totalPrompts: number;
  totalTemplates: number;
  totalHistory: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalPrompts: 0, totalTemplates: 0, totalHistory: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const stats = await apiGetStats();
      setStats({
        totalPrompts: stats.totalPrompts ?? 0,
        totalTemplates: stats.totalTemplates ?? 0,
        totalHistory: stats.totalHistory ?? 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { title: "Buat Prompt", desc: "Mulai buat prompt gambar AI baru", icon: Wand2, href: "/buat-prompt", color: "from-primary to-accent" },
    { title: "Perpustakaan", desc: `${stats.totalPrompts} prompt tersimpan`, icon: Library, href: "/perpustakaan", color: "from-neon-blue to-primary" },
    { title: "Riwayat", desc: `${stats.totalHistory} prompt dibuat`, icon: History, href: "/riwayat", color: "from-accent to-neon-purple" },
    { title: "Sertifikat", desc: "Buat prompt sertifikat", icon: Award, href: "/generator-sertifikat", color: "from-neon-purple to-primary" },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Selamat Datang! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Apa yang ingin Anda buat hari ini?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.href}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-elevated hover:border-primary/30"
          >
            <div className={`gradient-bg mb-3 flex h-10 w-10 items-center justify-center rounded-lg`}>
              <card.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-card-foreground">{card.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
