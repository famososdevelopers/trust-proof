import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import NuevaDenuncia from "./pages/NuevaDenuncia";
import DetalleDenuncia from "./pages/DetalleDenuncia";
import MisDenuncias from "./pages/MisDenuncias";
import Perfil from "./pages/Perfil";
import Moderacion from "./pages/Moderacion";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { setSession, setLoading, user } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nueva-denuncia"
        element={
          <ProtectedRoute>
            <NuevaDenuncia />
          </ProtectedRoute>
        }
      />
      <Route
        path="/denuncia/:id"
        element={
          <ProtectedRoute>
            <DetalleDenuncia />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-denuncias"
        element={
          <ProtectedRoute>
            <MisDenuncias />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/moderacion"
        element={
          <ProtectedRoute>
            <Moderacion />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
