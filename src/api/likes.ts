import { supabase } from '@/integrations/supabase/client';

/**
 * Obtiene los IDs de las denuncias que un usuario ha dado like
 */
export const fetchUserLikes = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('likes')
    .select('denuncia_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[API] Error fetching user likes:', error);
    throw error;
  }

  return new Set(data?.map((like) => like.denuncia_id) || []);
};

/**
 * Verifica si un usuario ha dado like a una denuncia específica
 */
export const checkLikeStatus = async (
  denunciaId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('denuncia_id', denunciaId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[API] Error checking like status:', error);
    throw error;
  }

  return !!data;
};

/**
 * Agrega un like a una denuncia
 */
export const addLike = async (
  denunciaId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('likes')
    .insert({ denuncia_id: denunciaId, user_id: userId });

  if (error) {
    console.error('[API] Error adding like:', error);
    throw error;
  }
};

/**
 * Elimina un like de una denuncia
 */
export const removeLike = async (
  denunciaId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('denuncia_id', denunciaId)
    .eq('user_id', userId);

  if (error) {
    console.error('[API] Error removing like:', error);
    throw error;
  }
};

/**
 * Alterna el like de una denuncia (agrega si no existe, elimina si existe)
 */
export const toggleLike = async (
  denunciaId: string,
  userId: string,
  isLiked: boolean
): Promise<void> => {
  if (isLiked) {
    await removeLike(denunciaId, userId);
  } else {
    await addLike(denunciaId, userId);
  }
};

/**
 * Obtiene el conteo de likes de un usuario
 */
export const countLikesByUserId = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('likes')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  if (error) {
    console.error('[API] Error counting user likes:', error);
    throw error;
  }

  return count || 0;
};
