import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  checkAdminStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  
  setUser: (user) => set({ user }),
  
  setSession: (session) => {
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      get().checkAdminStatus();
    } else {
      set({ isAdmin: false });
    }
  },
  
  setLoading: (loading) => set({ loading }),
  
  checkAdminStatus: async () => {
    const { user } = get();
    if (!user) {
      set({ isAdmin: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        set({ isAdmin: data.role === 'admin' });
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      set({ isAdmin: false });
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAdmin: false });
  },
}));
