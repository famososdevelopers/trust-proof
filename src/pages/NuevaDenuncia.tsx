import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { z } from 'zod';
import { Upload, X, FileText, Image, File, Loader2 } from 'lucide-react';
import { set } from 'date-fns';

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

const NuevaDenuncia = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nombre_asociado: '',
    mail_asociado: '',
    descripcion: '',
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > MAX_FILES) {
      toast.error(`Solo puedes subir hasta ${MAX_FILES} archivos`);
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

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadFile = async (file: File, denunciaId: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${denunciaId}_${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('evidencias')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
      
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('evidencias')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const saveEvidencia = async (
    denunciaId: string,
    file: File,
    url: string
  ) => {
    const { error } = await supabase.from('evidencias').insert({
      denuncia_id: denunciaId,
      nombre_archivo: file.name,
      tipo_archivo: file.type,
      tamano: file.size,
      url_storage: url,
    });

    if (error) throw error;
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }

    setLoading(true);

    try {
      const validatedData = denunciaSchema.parse(formData);

      setUploadProgress('Creando denuncia...');
      const { data: denuncia, error: denunciaError } = await supabase
      .from('denuncias')
      .insert({
        user_id: user.id,
        nombre_asociado: validatedData.nombre_asociado,
        mail_asociado: validatedData.mail_asociado || null,
        descripcion: validatedData.descripcion,
        estado: 'activa',
      })
      .select('id')
      .single();

      console.log('2. Respuesta denuncia:', { denuncia, denunciaError });

      if (denunciaError) throw denunciaError;

      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const fileItem = files[i];
          setUploadProgress(`Uploading file ${i + 1} of ${files.length}...`);

          try {
            const url = await uploadFile(fileItem.file, denuncia.id, user.id);
            await saveEvidencia(denuncia.id, fileItem.file, url);
          } catch (fileError) {
            console.error('Error uploading file:', fileError);
            toast.error(`Error al subir el archivo: ${fileItem.file.name}`);
          }
        }
      }

      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      toast.success('Denuncia creada exitosamente');
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error('Error creating denuncia:', error);
        toast.error('Error al crear la denuncia');
      }
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-card-hover">
          <CardHeader>
            <CardTitle className="text-2xl">Nueva Denuncia</CardTitle>
            <CardDescription>
              Registra una nueva denuncia de manera segura y verificada
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
                />
                <p className="text-xs text-muted-foreground">
                  {formData.descripcion.length}/1000 caracteres
                </p>
              </div>

              <div
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-colors hover:border-primary hover:bg-primary/5
                  ${files.length >= MAX_FILES ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {files.length >= MAX_FILES 
                    ? 'Máximo de archivos alcanzado'
                    : 'Haz clic para seleccionar archivos'
                  }
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading || files.length >= MAX_FILES}
                />
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
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
                        onClick={() => removeFile(fileItem.id)}
                        disabled={loading}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creando...' : 'Crear Denuncia'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
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

export default NuevaDenuncia;
