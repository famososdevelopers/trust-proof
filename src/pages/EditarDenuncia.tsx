import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { z } from 'zod';
import { Upload, X, FileText, Image, File, Loader2, Trash2 } from 'lucide-react';
import { uploadFile, saveEvidencia, deleteEvidencia } from '@/api/evidencias';
import { fetchDenunciaById, fetchEvidenciasByDenunciaId, Evidencia } from '@/api/denuncias';

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;

const denunciaSchema = z.object({
  nombre_asociado: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  mail_asociado: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000),
});

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

// Usar el tipo Evidencia de la API, pero permitir id como number para compatibilidad
type EvidenciaExistente = Omit<Evidencia, 'id' | 'denuncia_id'> & {
  id: number | string;
  denuncia_id?: string;
};

const EditarDenuncia = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [evidenciasExistentes, setEvidenciasExistentes] = useState<EvidenciaExistente[]>([]);
  const [evidenciasAEliminar, setEvidenciasAEliminar] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nombre_asociado: '',
    mail_asociado: '',
    descripcion: '',
  });

  useEffect(() => {
    if (id && user) {
      fetchDenuncia();
      fetchEvidencias();
    }
  }, [id, user]);

  const fetchDenuncia = async () => {
    if (!id) return;
    
    try {
      const data = await fetchDenunciaById(id);

      if (!data) {
        toast.error('Denuncia no encontrada');
        navigate('/mis-denuncias');
        return;
      }

      // Verificar que el usuario sea el dueño
      if (data.user_id !== user?.id) {
        toast.error('No tienes permiso para editar esta denuncia');
        navigate('/mis-denuncias');
        return;
      }

      setFormData({
        nombre_asociado: data.nombre_asociado,
        mail_asociado: data.mail_asociado || '',
        descripcion: data.descripcion,
      });
    } catch (error) {
      console.error('Error fetching denuncia:', error);
      toast.error('Error al cargar la denuncia');
      navigate('/mis-denuncias');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchEvidencias = async () => {
    if (!id) return;
    
    try {
      const data = await fetchEvidenciasByDenunciaId(id);
      // Convertir el tipo para compatibilidad con EvidenciaExistente
      setEvidenciasExistentes(
        data.map((ev) => ({
          ...ev,
          id: typeof ev.id === 'string' ? Number(ev.id) : ev.id,
        })) as EvidenciaExistente[]
      );
    } catch (error) {
      console.error('Error fetching evidencias:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalFiles = files.length + evidenciasExistentes.length - evidenciasAEliminar.length;

    if (totalFiles + selectedFiles.length > MAX_FILES) {
      toast.error(`Solo puedes tener hasta ${MAX_FILES} archivos en total`);
      return;
    }

    const validFiles: FilePreview[] = [];

    for (const file of selectedFiles) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`Tipo de archivo no permitido: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`El archivo es demasiado grande (máx 5MB): ${file.name}`);
        continue;
      }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      validFiles.push({ file, preview, id: crypto.randomUUID() });
    }

    setFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeNewFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const markEvidenciaForDeletion = (evidenciaId: string) => {
    setEvidenciasAEliminar(prev => [...prev, evidenciaId]);
  };

  const unmarkEvidenciaForDeletion = (evidenciaId: string) => {
    setEvidenciasAEliminar(prev => prev.filter(id => id !== evidenciaId));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id) {
      toast.error('Error de autenticación');
      return;
    }

    setLoading(true);

    try {
      const validatedData = denunciaSchema.parse(formData);

      // 1. Actualizar la denuncia
      setUploadProgress('Actualizando denuncia...');
      const { error: updateError } = await supabase
        .from('denuncias')
        .update({
          nombre_asociado: validatedData.nombre_asociado,
          mail_asociado: validatedData.mail_asociado || null,
          descripcion: validatedData.descripcion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Eliminar evidencias marcadas
      if (evidenciasAEliminar.length > 0) {
        setUploadProgress('Eliminando archivos...');
        for (const evidenciaId of evidenciasAEliminar) {
          const evidencia = evidenciasExistentes.find(e => e.id === Number(evidenciaId));
          if (evidencia) {
            try {
              await deleteEvidencia(evidencia);
            } catch (error) {
              console.error('Error deleting evidencia:', error);
            }
          }
        }
      }

      // 3. Subir nuevos archivos
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const fileItem = files[i];
          setUploadProgress(`Subiendo archivo ${i + 1} de ${files.length}...`);

          try {
            const url = await uploadFile(fileItem.file, id, user.id);
            await saveEvidencia(id, fileItem.file, url);
          } catch (fileError) {
            console.error('Error uploading file:', fileError);
            toast.error(`Error al subir el archivo: ${fileItem.file.name}`);
          }
        }
      }

      // Limpiar previews
      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      toast.success('Denuncia actualizada exitosamente');
      navigate('/mis-denuncias');
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error('Error updating denuncia:', error);
        toast.error('Error al actualizar la denuncia');
      }
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const totalArchivos = files.length + evidenciasExistentes.length - evidenciasAEliminar.length;

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-card-hover">
          <CardHeader>
            <CardTitle className="text-2xl">Editar Denuncia</CardTitle>
            <CardDescription>
              Modifica los datos de tu denuncia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nombre_asociado">
                  Nombre de la persona o entidad denunciada *
                </Label>
                <Input
                  id="nombre_asociado"
                  placeholder="Ej: Juan Pérez / Empresa XYZ"
                  value={formData.nombre_asociado}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre_asociado: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mail_asociado">
                  Email asociado (opcional)
                </Label>
                <Input
                  id="mail_asociado"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.mail_asociado}
                  onChange={(e) =>
                    setFormData({ ...formData, mail_asociado: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">
                  Descripción de la denuncia *
                </Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe detalladamente los hechos que motivan esta denuncia..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={6}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.descripcion.length}/1000 caracteres
                </p>
              </div>

              {/* Evidencias existentes */}
              {evidenciasExistentes.length > 0 && (
                <div className="space-y-2">
                  <Label>Archivos actuales</Label>
                  <div className="space-y-2">
                    {evidenciasExistentes.map((evidencia) => {
                      const isMarkedForDeletion = evidenciasAEliminar.includes(String(evidencia.id));
                      return (
                        <div
                          key={evidencia.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            isMarkedForDeletion 
                              ? 'bg-destructive/10 opacity-60' 
                              : 'bg-muted/50'
                          }`}
                        >
                          {evidencia.tipo_archivo.startsWith('image/') ? (
                            <img
                              src={evidencia.url_storage}
                              alt={evidencia.nombre_archivo}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-background rounded">
                              {getFileIcon(evidencia.tipo_archivo)}
                            </div>
                          )}
                            
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isMarkedForDeletion ? 'line-through' : ''}`}>
                              {evidencia.nombre_archivo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(evidencia.tamano)}
                            </p>
                          </div>
                            
                          {isMarkedForDeletion ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => unmarkEvidenciaForDeletion(String(evidencia.id))}
                              disabled={loading}
                            >
                              Restaurar
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => markEvidenciaForDeletion(String(evidencia.id))}
                              disabled={loading}
                              className="shrink-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nuevos archivos */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Nuevos archivos a subir</Label>
                  <div className="space-y-2">
                    {files.map((fileItem) => (
                      <div
                        key={fileItem.id}
                        className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                      >
                        {fileItem.preview ? (
                          <img
                            src={fileItem.preview}
                            alt={fileItem.file.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center bg-background rounded">
                            {getFileIcon(fileItem.file.type)}
                          </div>
                        )}
                          
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileItem.file.size)}
                          </p>
                        </div>
                          
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeNewFile(fileItem.id)}
                          disabled={loading}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Área para agregar archivos */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-colors hover:border-primary hover:bg-primary/5
                  ${totalArchivos >= MAX_FILES ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => totalArchivos < MAX_FILES && fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {totalArchivos >= MAX_FILES 
                    ? 'Máximo de archivos alcanzado'
                    : 'Haz clic para agregar más archivos'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalArchivos} de {MAX_FILES} archivos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading || totalArchivos >= MAX_FILES}
                />
              </div>

              {uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/mis-denuncias')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditarDenuncia;