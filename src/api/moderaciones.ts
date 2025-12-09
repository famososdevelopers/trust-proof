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

