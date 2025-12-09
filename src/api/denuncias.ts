import { supabase } from '@/integrations/supabase/client';

export interface Denuncia {
  id: string;
  nombre_asociado: string;
  mail_asociado: string | null;
  descripcion: string;
  estado: string;
  likes_count: number;
  comentarios_count: number;
  created_at: string;
  user_id?: string;
}

/**
 * Obtiene todas las denuncias ordenadas por fecha de creación
 */
export const fetchDenuncias = async (): Promise<Denuncia[]> => {
  const { data, error } = await supabase
    .from('denuncias')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API] Error fetching denuncias:', error);
    throw error;
  }

  return data || [];
};

/**
 * Obtiene las denuncias de un usuario específico
 */
export const fetchDenunciasByUserId = async (
  userId: string
): Promise<Denuncia[]> => {
  const { data, error } = await supabase
    .from('denuncias')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API] Error fetching user denuncias:', error);
    throw error;
  }

  return data || [];
};

/**
 * Obtiene una denuncia por su ID
 */
export const fetchDenunciaById = async (
  id: string
): Promise<Denuncia | null> => {
  const { data, error } = await supabase
    .from('denuncias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[API] Error fetching denuncia by id:', error);
    throw error;
  }

  return data;
};

/**
 * Crea una nueva denuncia
 */
export const createDenuncia = async (denunciaData: {
  user_id: string;
  nombre_asociado: string;
  mail_asociado?: string | null;
  descripcion: string;
  estado?: string;
}): Promise<Denuncia> => {
  const { data, error } = await supabase
    .from('denuncias')
    .insert({
      user_id: denunciaData.user_id,
      nombre_asociado: denunciaData.nombre_asociado,
      mail_asociado: denunciaData.mail_asociado || null,
      descripcion: denunciaData.descripcion,
      estado: denunciaData.estado || 'activa',
    })
    .select()
    .single();

  if (error) {
    console.error('[API] Error creating denuncia:', error);
    throw error;
  }

  return data;
};

/**
 * Elimina una denuncia por su ID
 */
export const deleteDenuncia = async (id: string): Promise<void> => {
  const { error } = await supabase.from('denuncias').delete().eq('id', id);

  if (error) {
    console.error('[API] Error deleting denuncia:', error);
    throw error;
  }
};

/**
 * Obtiene denuncias para moderación (estados: 'en revisión' o 'activa')
 */
export const fetchDenunciasForModeration = async (): Promise<Denuncia[]> => {
  const { data, error } = await supabase
    .from('denuncias')
    .select('*')
    .in('estado', ['en revisión', 'activa'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API] Error fetching denuncias for moderation:', error);
    throw error;
  }

  return data || [];
};

/**
 * Actualiza el estado de una denuncia
 */
export const updateDenunciaEstado = async (
  id: string,
  nuevoEstado: string
): Promise<void> => {
  const { error } = await supabase
    .from('denuncias')
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[API] Error updating denuncia estado:', error);
    throw error;
  }
};

/**
 * Obtiene el conteo de denuncias de un usuario
 */
export const countDenunciasByUserId = async (
  userId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from('denuncias')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  if (error) {
    console.error('[API] Error counting user denuncias:', error);
    throw error;
  }

  return count || 0;
};
