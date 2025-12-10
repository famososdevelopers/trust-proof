import { supabase } from '@/integrations/supabase/client';
import { Evidencia } from './denuncias';

/**
 * Sube un archivo a Supabase Storage
 */
export const uploadFile = async (
  file: File,
  denunciaId: string,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${denunciaId}_${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('evidencias')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[API] Error uploading file:', error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from('evidencias')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

/**
 * Guarda la información de una evidencia en la base de datos
 */
export const saveEvidencia = async (
  denunciaId: string,
  file: File,
  url: string
): Promise<void> => {
  const { error } = await supabase.from('evidencias').insert({
    denuncia_id: denunciaId,
    nombre_archivo: file.name,
    tipo_archivo: file.type,
    tamano: file.size,
    url_storage: url,
  });

  if (error) {
    console.error('[API] Error saving evidencia:', error);
    throw error;
  }
};

/**
 * Elimina una evidencia de Storage y de la base de datos
 */
export const deleteEvidencia = async (
  evidencia: Evidencia | { id: string | number; url_storage: string }
): Promise<void> => {
  // Extraer el nombre del archivo de la URL
  const urlParts = evidencia.url_storage.split('/');
  const fileName = urlParts[urlParts.length - 1];

  // Eliminar de Storage
  const { error: storageError } = await supabase.storage
    .from('evidencias')
    .remove([fileName]);

  if (storageError) {
    console.error('[API] Error deleting from storage:', storageError);
    // No lanzamos error aquí para permitir que continúe con la eliminación de la BD
  }

  // Eliminar de la tabla
  // El id en la base de datos es number, así que convertimos si es necesario
  const evidenciaId =
    typeof evidencia.id === 'number' ? evidencia.id : Number(evidencia.id);
  const { error: dbError } = await supabase
    .from('evidencias')
    .delete()
    .eq('id', evidenciaId);

  if (dbError) {
    console.error('[API] Error deleting evidencia from database:', dbError);
    throw dbError;
  }
};

/**
 * Elimina todas las evidencias de una denuncia (de Storage y de la base de datos)
 */
export const deleteAllEvidenciasByDenunciaId = async (
  denunciaId: string
): Promise<void> => {
  // Obtener todas las evidencias de la denuncia
  const { data: evidencias, error: fetchError } = await supabase
    .from('evidencias')
    .select('*')
    .eq('denuncia_id', denunciaId);

  if (fetchError) {
    console.error('[API] Error fetching evidencias:', fetchError);
    throw fetchError;
  }

  if (!evidencias || evidencias.length === 0) {
    return; // No hay evidencias que eliminar
  }

  // Extraer nombres de archivos de Storage
  const fileNames: string[] = [];
  evidencias.forEach((evidencia) => {
    if (evidencia.url_storage) {
      const urlParts = evidencia.url_storage.split('/');
      const fileName = urlParts[urlParts.length - 1];
      if (fileName) {
        fileNames.push(fileName);
      }
    }
  });

  // Eliminar de Storage (si hay archivos)
  if (fileNames.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('evidencias')
      .remove(fileNames);

    if (storageError) {
      console.error('[API] Error deleting files from storage:', storageError);
      // Continuamos con la eliminación de la BD aunque falle el storage
    }
  }

  // Eliminar todas las evidencias de la base de datos
  const { error: dbError } = await supabase
    .from('evidencias')
    .delete()
    .eq('denuncia_id', denunciaId);

  if (dbError) {
    console.error('[API] Error deleting evidencias from database:', dbError);
    throw dbError;
  }
};
