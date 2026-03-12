import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import BuatPrompt from "@/pages/BuatPrompt";
import AnalisisGambar from "@/pages/AnalisisGambar";
import GeneratorSertifikat from "@/pages/GeneratorSertifikat";
import PerpustakaanPrompt from "@/pages/PerpustakaanPrompt";
import TemplatePrompt from "@/pages/TemplatePrompt";
import PembuatDropdown from "@/pages/PembuatDropdown";
import RiwayatPrompt from "@/pages/RiwayatPrompt";
import Pengaturan from "@/pages/Pengaturan";
import Profil from "@/pages/Profil";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Wajib login: semua route app pakai auth asli database (JWT dari API)
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPageWrapper />} />
              <Route path="/" element={<ProtectedRoutes />}>
                <Route index element={<Dashboard />} />
                <Route path="buat-prompt" element={<BuatPrompt />} />
                <Route path="analisis-gambar" element={<AnalisisGambar />} />
                <Route path="generator-sertifikat" element={<GeneratorSertifikat />} />
                <Route path="perpustakaan" element={<PerpustakaanPrompt />} />
                <Route path="template" element={<TemplatePrompt />} />
                <Route path="pembuat-dropdown" element={<PembuatDropdown />} />
                <Route path="riwayat" element={<RiwayatPrompt />} />
                <Route path="pengaturan" element={<Pengaturan />} />
                <Route path="profil" element={<Profil />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

function AuthPageWrapper() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

export default App;
