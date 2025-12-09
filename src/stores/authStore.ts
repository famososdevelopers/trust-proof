import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserRole } from '@/api/users';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  initialized: boolean;
  adminCheckedUserId: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  checkAdminStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAdmin: false,
      loading: true,
      initialized: false,
      adminCheckedUserId: null,

      setUser: (user) => set({ user }),

      setSession: (session) => {
        const currentUser = session?.user ?? null;
        const currentUserId = currentUser?.id ?? null;
        const previousUserId = get().user?.id ?? null;
        const previousAdminCheckedUserId = get().adminCheckedUserId;

        // Solo actualizar si el usuario cambió o si es la primera vez
        const shouldUpdateUser = currentUserId !== previousUserId;
        const shouldCheckAdmin =
          currentUserId &&
          (currentUserId !== previousAdminCheckedUserId || shouldUpdateUser);

        set({
          session,
          user: currentUser,
          // Limpiar adminCheckedUserId si el usuario cambió
          adminCheckedUserId: shouldUpdateUser
            ? null
            : get().adminCheckedUserId,
        });

        if (shouldCheckAdmin) {
          // No bloquear el flujo esperando checkAdminStatus
          get()
            .checkAdminStatus()
            .catch((error) => {
              console.error('Error checking admin status:', error);
              // Asegurar que isAdmin sea false si hay error
              set({ isAdmin: false });
            });
        } else if (!currentUserId) {
          set({ isAdmin: false, adminCheckedUserId: null });
        }
      },

      setLoading: (loading) => set({ loading }),

      setInitialized: (initialized) => set({ initialized }),

      checkAdminStatus: async () => {
        const { user, adminCheckedUserId } = get();
        if (!user) {
          set({ isAdmin: false, adminCheckedUserId: null });
          return;
        }

        // Si ya verificamos este usuario, no volver a verificar
        if (adminCheckedUserId === user.id) {
          return;
        }

        try {
          const role = await fetchUserRole(user.id);
          set({
            isAdmin: role === 'admin',
            adminCheckedUserId: user.id,
          });
        } catch (error) {
          console.error('Error checking admin status:', error);
          set({ isAdmin: false, adminCheckedUserId: user.id });
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Error signing out:', error);
        } finally {
          // Siempre limpiar el estado local, incluso si falla el signOut de Supabase
          set({
            user: null,
            session: null,
            isAdmin: false,
            loading: false,
            initialized: false,
            adminCheckedUserId: null,
          });
          // Limpiar el almacenamiento persistido
          localStorage.removeItem('auth-storage');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // No persistir la sesión completa porque Supabase ya la maneja en localStorage
        // Persistir isAdmin y adminCheckedUserId para evitar consultas innecesarias
        isAdmin: state.isAdmin,
        adminCheckedUserId: state.adminCheckedUserId,
      }),
      // Cuando se rehidrata, establecer estado inicial
      // La sesión se obtendrá de Supabase en App.tsx de forma síncrona
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Limpiar user y session porque se obtendrán de Supabase
          // Mantener loading en true para que App.tsx lo inicialice
          state.user = null;
          state.session = null;
          state.loading = true;
          state.initialized = false;
        }
      },
    }
  )
);
