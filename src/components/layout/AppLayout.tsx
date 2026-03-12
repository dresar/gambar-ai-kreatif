import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/components/AuthProvider";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xs font-semibold text-primary">
                  {user?.email?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
