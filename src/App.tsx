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
import EditarDenuncia from "./pages/EditarDenuncia";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { setSession, setLoading, setInitialized, user, initialized } =
    useAuthStore();

  // Listener de auth - se ejecuta UNA SOLA VEZ al montar
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // ⚠️ IMPORTANTE: Este callback NO debe ser async
      // Usar await aquí causa deadlock en Supabase
      // https://github.com/supabase/supabase/issues/8552
      try {
        // Solo actualizar la sesión en eventos específicos, NO en todos
        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setLoading(false);
          setInitialized(true);

          // IMPORTANTE: NO usar await dentro de onAuthStateChange (causa deadlock)
          // Usar setTimeout para diferir llamadas asíncronas
          // https://github.com/supabase/supabase/issues/8552
          setTimeout(async () => {
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
          }, 0);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setLoading(false);
          setInitialized(false);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Sin dependencias - se ejecuta UNA SOLA VEZ (setSession, setLoading, setInitialized son estables)

  // Inicialización - solo cuando sea necesario
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let visibilityTimeout: NodeJS.Timeout | null = null;

    // Función auxiliar para inicializar la sesión
    const initializeAuth = async () => {
      try {
        // Primero, intentar obtener la sesión actual
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        // Si hay una sesión en localStorage, verificar si necesita refrescarse
        if (currentSession) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = currentSession.expires_at || 0;
          const expiresIn = expiresAt - now;

          // Solo refrescar si el token está próximo a expirar (menos de 5 minutos)
          // o si ya expiró
          const shouldRefresh = expiresIn < 300;

          if (shouldRefresh) {
            // Intentar refrescar la sesión
            const {
              data: { session: refreshedSession },
              error: refreshError,
            } = await supabase.auth.refreshSession();

            if (!mounted) return;

            if (refreshError) {
              // Si el error es de red o temporal, mantener la sesión actual
              // Solo limpiar si es un error de autenticación real
              if (
                refreshError.message?.includes('Invalid Refresh Token') ||
                refreshError.message?.includes('Invalid API key') ||
                refreshError.status === 401
              ) {
                await supabase.auth.signOut();
                setSession(null);
              } else {
                // Error temporal, usar la sesión actual
                setSession(currentSession);
              }

              setLoading(false);
              setInitialized(true);
              return;
            }

            // Usar la sesión refrescada
            if (refreshedSession) {
              setSession(refreshedSession);
            } else {
              // Si no hay sesión refrescada pero tampoco error, usar la actual
              setSession(currentSession);
            }
          } else {
            // Token todavía válido, usar la sesión actual sin refrescar
            setSession(currentSession);
          }
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
    }

    // Timeout de seguridad para evitar loading infinito
    timeoutId = setTimeout(() => {
      if (mounted) {
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
          .catch(() => {
            if (mounted) {
              setLoading(false);
              setInitialized(true);
            }
          });
      }
    }, 3000);

    // Refrescar sesión cuando la página vuelve a ser visible (solo si ya está inicializado)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted && initialized) {
        // Limpiar timeout anterior si existe
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }

        // Esperar un momento antes de refrescar para evitar múltiples llamadas
        visibilityTimeout = setTimeout(() => {
          if (!mounted || !initialized) return;

          // Solo refrescar si hay usuario, para evitar llamadas innecesarias
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            supabase.auth
              .refreshSession()
              .then(({ data: { session }, error }) => {
                if (!mounted) return;

                if (error) {
                  // Solo limpiar si es un error de autenticación real, no temporal
                  if (
                    error.message?.includes('Invalid Refresh Token') ||
                    error.message?.includes('Invalid API key') ||
                    error.status === 401
                  ) {
                    setSession(null);
                  }
                  return;
                }

                // Actualizar con la sesión refrescada
                if (session) {
                  setSession(session);
                }
              })
              .catch(() => {
                // No limpiar en catch - puede ser error de red
              });
          }
        }, 500);
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
        path="/editar-denuncia/:id"
        element={
          <ProtectedRoute>
            <EditarDenuncia />
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
