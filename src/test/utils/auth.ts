import { act } from '@testing-library/react';

import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const ensureSessionApplied = async () => {
  const { data } = await supabase.auth.getSession();
  const { setSession, setLoading } = useAuthStore.getState();

  await act(async () => {
    setSession(data.session);
    setLoading(false);
  });

  return data.session;
};

export const loginAsUser = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password',
  });

  if (error) {
    throw new Error(error.message);
  }

  return ensureSessionApplied();
};

export const loginAsAdmin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'password',
  });

  if (error) {
    throw new Error(error.message);
  }

  return ensureSessionApplied();
};

export const logout = async () => {
  await supabase.auth.signOut();
  const { setSession, setUser, setLoading } = useAuthStore.getState();
  await act(async () => {
    setSession(null);
    setUser(null);
    setLoading(false);
  });
};


