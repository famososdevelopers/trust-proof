import { supabase } from '@/integrations/supabase/client';

/**
 * Inicia sesión con email y contraseña
 */
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[API] Error signing in:', error);
    throw error;
  }

  return data;
};

/**
 * Registra un nuevo usuario
 */
export const signUp = async (
  email: string,
  password: string,
  redirectTo?: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo || `${window.location.origin}/verification-success`,
    },
  });

  if (error) {
    console.error('[API] Error signing up:', error);
    throw error;
  }

  return data;
};

/**
 * Envía un email para restablecer la contraseña
 */
export const resetPasswordForEmail = async (
  email: string,
  redirectTo?: string
) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error('[API] Error resetting password:', error);
    throw error;
  }
};

/**
 * Actualiza la contraseña del usuario actual
 */
export const updateUserPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error('[API] Error updating password:', error);
    throw error;
  }
};

