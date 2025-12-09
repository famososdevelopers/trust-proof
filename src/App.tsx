import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { userExists, createUser } from '@/api/users';
import Auth from './pages/Auth';
import Home from './pages/Home';
import NuevaDenuncia from './pages/NuevaDenuncia';
import DetalleDenuncia from './pages/DetalleDenuncia';
import MisDenuncias from './pages/MisDenuncias';
import Perfil from './pages/Perfil';
import Moderacion from './pages/Moderacion';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/VerifyEmail';
import VerificationSuccess from './pages/VerificationSuccess';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { setSession, setLoading, setInitialized, user, initialized, loading } =
    useAuthStore();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let visibilityTimeout: NodeJS.Timeout | null = null;

    // Función auxiliar para inicializar la sesión
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('[AppRoutes] Error getting session:', error);
          setLoading(false);
          setInitialized(true);
          return;
        }

        // Si hay una sesión persistida, establecerla inmediatamente
        if (session) {
          setSession(session);
        } else {
          // No hay sesión, asegurar que el estado esté limpio
          setSession(null);
        }

        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('[AppRoutes] Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Inicializar siempre si no está inicializado
    // Esto garantiza que siempre se verifique la sesión al montar
    if (!initialized) {
      initializeAuth();
    } else {
      // Si ya está inicializado, asegurar que loading esté en false
      // Esto previene que quede bloqueado en loading si hubo algún problema anterior
      const currentLoading = useAuthStore.getState().loading;
      if (currentLoading) {
        setLoading(false);
      }

      // Si tenemos usuario, verificar rápidamente (en segundo plano) que la sesión sigue válida
      if (user && mounted) {
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (!mounted) return;

            // Solo actualizar si la sesión realmente cambió
            if (session?.user?.id !== user.id || !session) {
              setSession(session);
            }
          })
          .catch(() => {
            // Silenciar errores de verificación en segundo plano
          });
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        // Limpiar timeout si existe
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        setSession(session);
        setLoading(false);
        setInitialized(true);

        if (event === 'SIGNED_IN' && session) {
          try {
            const exists = await userExists(session.user.id);
            if (!exists) {
              await createUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0],
                role: 'user',
              });
            }
          } catch (error) {
            console.error('[AppRoutes] Error creating user:', error);
          }
        }

        // Si se cierra sesión, limpiar estado
        if (event === 'SIGNED_OUT') {
          setLoading(false);
          setInitialized(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    });

    // Timeout de seguridad para evitar loading infinito
    // Reducido a 3 segundos para una mejor experiencia de usuario
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[AppRoutes] Auth initialization timeout, forcing state');
        // Verificar una última vez si hay sesión antes de forzar
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (mounted) {
              setSession(session);
              setLoading(false);
              setInitialized(true);
            }
          })
          .catch((error) => {
            console.error(
              '[AppRoutes] Error getting session on timeout:',
              error
            );
            if (mounted) {
              setLoading(false);
              setInitialized(true);
            }
          });
      }
    }, 3000); // 3 segundos máximo

    // Refrescar sesión cuando la página vuelve a ser visible (solo si ya está inicializado)
    // Usar un debounce para evitar múltiples llamadas
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted && initialized) {
        // Limpiar timeout anterior si existe
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }

        // Esperar un momento antes de refrescar para evitar llamadas múltiples
        visibilityTimeout = setTimeout(() => {
          if (!mounted || !initialized) return;

          // Solo refrescar si hay usuario, para evitar llamadas innecesarias
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            supabase.auth
              .getSession()
              .then(({ data: { session }, error }) => {
                if (!mounted) return;

                if (error) {
                  console.error(
                    'Error refreshing session on visibility change:',
                    error
                  );
                  return;
                }

                // Solo actualizar si la sesión cambió realmente
                const currentSession = useAuthStore.getState().session;
                const sessionChanged =
                  !currentSession ||
                  !session ||
                  currentSession.access_token !== session.access_token ||
                  currentSession.user?.id !== session.user?.id;

                if (sessionChanged && session) {
                  setSession(session);
                }
              })
              .catch((error) => {
                console.error(
                  'Error refreshing session on visibility change:',
                  error
                );
              });
          }
        }, 500); // Esperar 500ms antes de refrescar
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setSession, setLoading, setInitialized, initialized, user]);

  return (
    <Routes>
      <Route
        path='/auth'
        element={user ? <Navigate to='/' replace /> : <Auth />}
      />
      <Route path='/verify-email' element={<VerifyEmail />} />
      <Route path='/verification-success' element={<VerificationSuccess />} />
      <Route path='/forgot-password' element={<ForgotPassword />} />
      <Route path='/reset-password' element={<ResetPassword />} />
      <Route
        path='/'
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path='/nueva-denuncia'
        element={
          <ProtectedRoute>
            <NuevaDenuncia />
          </ProtectedRoute>
        }
      />
      <Route
        path='/denuncia/:id'
        element={
          <ProtectedRoute>
            <DetalleDenuncia />
          </ProtectedRoute>
        }
      />
      <Route
        path='/mis-denuncias'
        element={
          <ProtectedRoute>
            <MisDenuncias />
          </ProtectedRoute>
        }
      />
      <Route
        path='/perfil'
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      <Route
        path='/moderacion'
        element={
          <ProtectedRoute>
            <Moderacion />
          </ProtectedRoute>
        }
      />
      <Route path='*' element={<NotFound />} />
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
