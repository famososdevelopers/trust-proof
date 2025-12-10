import { supabase } from '@/integrations/supabase/client';

/**
 * Crea una nueva moderación
 */
export const createModeracion = async (moderacionData: {
  denuncia_id: string;
  admin_id: string;
  accion: string;
  comentario?: string | null;
}): Promise<void> => {
  const { error } = await supabase
    .from('moderaciones')
    .insert({
      denuncia_id: moderacionData.denuncia_id,
      admin_id: moderacionData.admin_id,
      accion: moderacionData.accion,
      comentario: moderacionData.comentario || null,
    });

  if (error) {
    console.error('[API] Error creating moderacion:', error);
    throw error;
  }
};

/**
 * Verifica si un admin ya reportó una denuncia específica
 */
export const checkReporteStatus = async (
  denunciaId: string,
  adminId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('moderaciones')
    .select('id')
    .eq('denuncia_id', denunciaId)
    .eq('admin_id', adminId)
    .eq('accion', 'reportar')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, no es un error real
    console.error('[API] Error checking reporte status:', error);
    throw error;
  }

  return !!data;
};

/**
 * Obtiene las moderaciones pendientes (en revisión) con sus denuncias y evidencias
 */
export const fetchModeracionesPendientes = async () => {
  const { data, error } = await supabase
    .from('moderaciones')
    .select(`
      *,
      denuncia:denuncias(nombre_asociado, descripcion, estado, user_id),
      admin:users!moderaciones_admin_id_fkey(name, email)
    `)
    .eq('accion', 'en_revision')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('[API] Error fetching moderaciones pendientes:', error);
    throw error;
  }

  // Cargar evidencias para cada moderación
  const moderacionesConEvidencias = await Promise.all(
    (data || []).map(async (mod) => {
      const { data: evidencias } = await supabase
        .from('evidencias')
        .select('*')
        .eq('denuncia_id', mod.denuncia_id);
      return { ...mod, evidencias: evidencias || [] };
    })
  );

  return moderacionesConEvidencias;
};

/**
 * Obtiene el historial de moderaciones (todas excepto 'en_revision') con sus denuncias y evidencias
 */
export const fetchHistorialModeraciones = async () => {
  const { data, error } = await supabase
    .from('moderaciones')
    .select(`
      *,
      denuncia:denuncias(nombre_asociado, descripcion, estado, user_id),
      admin:users!moderaciones_admin_id_fkey(name, email)
    `)
    .neq('accion', 'en_revision')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('[API] Error fetching historial:', error);
    throw error;
  }

  // Cargar evidencias para cada moderación
  const moderacionesConEvidencias = await Promise.all(
    (data || []).map(async (mod) => {
      const { data: evidencias } = await supabase
        .from('evidencias')
        .select('*')
        .eq('denuncia_id', mod.denuncia_id);
      return { ...mod, evidencias: evidencias || [] };
    })
  );

  return moderacionesConEvidencias;
};

/**
 * Actualiza una moderación con nueva acción y comentario
 */
export const updateModeracion = async (
  moderacionId: string,
  accion: string,
  comentario?: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('moderaciones')
    .update({
      accion,
      comentario: comentario || null,
      fecha: new Date().toISOString(),
    })
    .eq('id', moderacionId);

  if (error) {
    console.error('[API] Error updating moderacion:', error);
    throw error;
  }
};

/**
 * Banea a un usuario y da de baja todas sus denuncias
 */
export const banUserAndDenuncias = async (
  moderacionId: string,
  userId: string,
  comentario?: string | null
): Promise<void> => {
  // Actualizar la moderación
  const { error: updateModeracionError } = await supabase
    .from('moderaciones')
    .update({
      accion: 'banear_usuario',
      comentario: comentario || null,
      fecha: new Date().toISOString(),
    })
    .eq('id', moderacionId);

  if (updateModeracionError) {
    console.error('[API] Error updating moderacion:', updateModeracionError);
    throw updateModeracionError;
  }

  // Banear al usuario
  const { error: banUserError } = await supabase
    .from('users')
    .update({
      role: 'banned',
    })
    .eq('id', userId);

  if (banUserError) {
    console.error('[API] Error banning user:', banUserError);
    throw banUserError;
  }

  // Dar de baja todas las denuncias del usuario
  const { error: bajaDenunciasError } = await supabase
    .from('denuncias')
    .update({
      estado: 'bajada',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (bajaDenunciasError) {
    console.error('[API] Error updating denuncias:', bajaDenunciasError);
    throw bajaDenunciasError;
  }
};

