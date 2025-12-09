import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: string;
}

/**
 * Obtiene el perfil de un usuario por su ID
 */
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[API] Error fetching user profile:', error);
    throw error;
  }

  return data;
};

/**
 * Obtiene el rol de un usuario (para verificar si es admin)
 */
export const fetchUserRole = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[API] Error fetching user role:', error);
    throw error;
  }

  return data?.role || null;
};

/**
 * Crea un nuevo usuario en la base de datos
 */
export const createUser = async (userData: {
  id: string;
  email: string;
  name?: string;
  role?: string;
}): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userData.id,
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      role: userData.role || 'user',
    })
    .select()
    .single();

  if (error) {
    console.error('[API] Error creating user:', error);
    throw error;
  }

  return data;
};

/**
 * Verifica si un usuario ya existe en la base de datos
 */
export const userExists = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, no es un error real
    console.error('[API] Error checking if user exists:', error);
    throw error;
  }

  return !!data;
};

