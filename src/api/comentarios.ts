import { supabase } from '@/integrations/supabase/client';

export interface Comentario {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string;
  denuncia_id: string;
  users?: {
    name: string;
  };
}

/**
 * Obtiene todos los comentarios de una denuncia
 */
export const fetchComentariosByDenunciaId = async (
  denunciaId: string
): Promise<Comentario[]> => {
  const { data, error } = await supabase
    .from('comentarios')
    .select('*, users(name)')
    .eq('denuncia_id', denunciaId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API] Error fetching comentarios:', error);
    throw error;
  }

  return data || [];
};

/**
 * Crea un nuevo comentario
 */
export const createComentario = async (comentarioData: {
  denuncia_id: string;
  user_id: string;
  contenido: string;
}): Promise<Comentario> => {
  const { data, error } = await supabase
    .from('comentarios')
    .insert({
      denuncia_id: comentarioData.denuncia_id,
      user_id: comentarioData.user_id,
      contenido: comentarioData.contenido.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('[API] Error creating comentario:', error);
    throw error;
  }

  return data;
};

/**
 * Elimina un comentario por su ID
 */
export const deleteComentario = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('comentarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[API] Error deleting comentario:', error);
    throw error;
  }
};

/**
 * Obtiene el conteo de comentarios de un usuario
 */
export const countComentariosByUserId = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('comentarios')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  if (error) {
    console.error('[API] Error counting user comentarios:', error);
    throw error;
  }

  return count || 0;
};

