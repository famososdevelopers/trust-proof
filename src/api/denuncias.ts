import { supabase } from '@/integrations/supabase/client';
import { deleteAllEvidenciasByDenunciaId } from './evidencias';

export interface Evidencia {
  id: string;
  nombre_archivo: string;
  tipo_archivo: string;
  tamano: number;
  url_storage: string;
  denuncia_id: string;
}

export interface Denuncia {
  id: string;
  nombre_asociado: string;
  mail_asociado: string | null;
  descripcion: string;
  estado: string;
  likes_count: number;
  comentarios_count: number;
  created_at: string;
  evidencias?: Evidencia[];
  user_id?: string;
}

/**
 * Obtiene todas las denuncias ordenadas por fecha de creación
 */
export const fetchDenuncias = async (): Promise<Denuncia[]> => {
  const { data, error } = await supabase
    .from('denuncias')
    .select('*, evidencias(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API] Error fetching denuncias:', error);
    throw error;
  }

  return (data || []).map((denuncia) => ({
    ...denuncia,
    evidencias: denuncia.evidencias.map((evidencia) => ({
      ...evidencia,
      id: String(evidencia.id),
    })),
  }));
};

/**
 * Obtiene las denuncias de un usuario específico
 */
export const fetchDenunciasByUserId = async (
  userId: string
): Promise<Denuncia[]> => {
  const { data, error } = await supabase
    .from('denuncias')
    .select(
      '*, evidencias(id, tipo_archivo, url_storage, nombre_archivo, tamano, denuncia_id)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API] Error fetching user denuncias:', error);
    throw error;
  }

  return (data || []).map((denuncia) => ({
    ...denuncia,
    evidencias: (denuncia.evidencias || []).map((evidencia) => ({
      ...evidencia,
      id: String(evidencia.id),
    })),
  }));
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
 * Primero elimina todas las evidencias asociadas y luego la denuncia
 */
export const deleteDenuncia = async (id: string): Promise<void> => {
  // Primero eliminar todas las evidencias asociadas
  try {
    await deleteAllEvidenciasByDenunciaId(id);
  } catch (error) {
    console.error(
      '[API] Error deleting evidencias before deleting denuncia:',
      error
    );
    // Continuamos con la eliminación de la denuncia aunque falle la eliminación de evidencias
  }

  // Luego eliminar la denuncia
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

/**
 * Obtiene todas las evidencias de una denuncia
 */
export const fetchEvidenciasByDenunciaId = async (
  denunciaId: string
): Promise<Evidencia[]> => {
  const { data, error } = await supabase
    .from('evidencias')
    .select('*')
    .eq('denuncia_id', denunciaId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[API] Error fetching evidencias:', error);
    throw error;
  }

  return (data || []).map((item) => ({ ...item, id: String(item.id) }));
};
