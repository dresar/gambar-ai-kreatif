import {
  LayoutDashboard,
  Wand2,
  ScanSearch,
  Sparkles,
  Library,
  ListPlus,
  History,
  User,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/components/ThemeProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Buat Prompt", url: "/buat-prompt", icon: Wand2 },
  { title: "Analisis Gambar", url: "/analisis-gambar", icon: ScanSearch },
  { title: "Sertifikat", url: "/generator-sertifikat", icon: Sparkles },
  { title: "Library", url: "/perpustakaan", icon: Library },
  { title: "Dropdown", url: "/pembuat-dropdown", icon: ListPlus },
  { title: "Riwayat", url: "/riwayat", icon: History },
  { title: "Profil", url: "/profil", icon: User },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { theme, toggleTheme } = useTheme();
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex min-h-[4.25rem] items-center gap-2 border-b border-sidebar-border py-4 pl-4 pr-2 md:px-5 md:pr-5">
        <div className="gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Wand2 className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-sm font-bold leading-tight tracking-tight text-sidebar-foreground pr-2">
            AI Prompt Gen
          </span>
        )}
        {isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Tutup menu"
            onClick={() => setOpenMobile(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <SidebarContent className="gap-0 px-2 pb-4 pt-5 sidebar-scroll">
        <SidebarGroup className="p-0 px-2">
          <SidebarGroupLabel className="mb-3 h-auto px-1 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto min-h-11 py-2.5">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
                      {!collapsed && <span className="leading-snug">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              className="h-auto min-h-11 flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px] shrink-0" /> : <Moon className="h-[18px] w-[18px] shrink-0" />}
              {!collapsed && <span>{theme === "dark" ? "Mode Terang" : "Mode Gelap"}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
