import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ArrowLeft, Trash2, MoreVertical, Flag, Image, FileText, File, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Navbar from '@/components/Navbar';
import ReportarDenunciaModal from '@/components/ReportarDenunciaModal';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Evidencia } from '@/utils/interfaces';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Denuncia } from '@/utils/interfaces';

interface Comentario {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string;
  users: {
    name: string;
  };
}
import { fetchDenunciaById, type Denuncia } from '@/api/denuncias';
import { fetchComentariosByDenunciaId, createComentario, deleteComentario, type Comentario } from '@/api/comentarios';
import { checkLikeStatus, toggleLike } from '@/api/likes';
import { checkReporteStatus, createModeracion } from '@/api/moderaciones';


const DetalleDenuncia = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, initialized } = useAuthStore();
  const [denuncia, setDenuncia] = useState<Denuncia | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [yaReportado, setYaReportado] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchDenuncia();
      fetchComentarios();
      fetchEvidencias();
      if (user) {
        checkLikeStatus();
        checkReporteStatus();
      }
    }
  }, [id, user]);
  
  const loadDenuncia = useCallback(async () => {
    if (!id) return;

    try {
      const data = await fetchDenunciaById(id);
      setDenuncia(data);
    } catch (error) {
      console.error('Error fetching denuncia:', error);
      toast.error('Error al cargar la denuncia');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComentarios = useCallback(async () => {
    if (!id) return;

    try {
      const data = await fetchComentariosByDenunciaId(id);
      setComentarios(data);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
    }
  }, [id]);

  const fetchEvidencias = async () => {
    try {
      const { data, error } = await supabase
        .from('evidencias')
        .select('*')
        .eq('denuncia_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvidencias((data || []).map(item => ({ ...item, id: String(item.id) })));
    } catch (error) {
      console.error('Error fetching evidencias:', error);
    }
  };

  const loadLikeStatus = useCallback(async () => {
    if (!user?.id || !id) return;

    try {
      const liked = await checkLikeStatus(id, user.id);
      setIsLiked(liked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  }, [user?.id, id]);

  const loadReporteStatus = useCallback(async () => {
    if (!user?.id || !id) return;

    try {
      const reported = await checkReporteStatus(id, user.id);
      setYaReportado(reported);
    } catch (error) {
      console.error('Error checking reporte status:', error);
    }
  }, [user?.id, id]);

  useEffect(() => {
    // Esperar a que la autenticación esté inicializada antes de cargar datos
    if (!initialized) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        await Promise.all([
          loadDenuncia(),
          loadComentarios(),
        ]);

        if (mounted && user?.id) {
          await Promise.all([
            loadLikeStatus(),
            loadReporteStatus(),
          ]);
        }
      } catch (error) {
        console.error('[DetalleDenuncia] Error loading data:', error);
        // Reintentar una vez después de un breve delay
        if (mounted) {
          setTimeout(async () => {
            if (mounted && id) {
              try {
                await Promise.all([
                  loadDenuncia(),
                  loadComentarios(),
                ]);
                if (user?.id) {
                  await Promise.all([
                    loadLikeStatus(),
                    loadReporteStatus(),
                  ]);
                }
              } catch (retryError) {
                console.error('[DetalleDenuncia] Error on retry:', retryError);
                if (mounted) {
                  setLoading(false);
                }
              }
            }
          }, 1000);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Timeout de seguridad para evitar loading infinito
    timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 5000); // 5 segundos máximo

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initialized, id, user?.id, loadDenuncia, loadComentarios, loadLikeStatus, loadReporteStatus]);

  const handleLike = async () => {
    if (!user || !id) {
      toast.error('Debes iniciar sesión');
      return;
    }

    try {
      await toggleLike(id, user.id, isLiked);
      setIsLiked(!isLiked);
      await loadDenuncia();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al procesar el like');
    }
  };

  const handleComentario = async () => {
    if (!user || !id) {
      toast.error('Debes iniciar sesión');
      return;
    }

    if (!nuevoComentario.trim()) {
      toast.error('Escribe un comentario');
      return;
    }

    try {
      await createComentario({
        denuncia_id: id,
        user_id: user.id,
        contenido: nuevoComentario.trim(),
      });

      setNuevoComentario('');
      await loadComentarios();
      await loadDenuncia();
      toast.success('Comentario agregado');
    } catch (error) {
      console.error('Error adding comentario:', error);
      toast.error('Error al agregar comentario');
    }
  };

  const handleDeleteComentario = async (comentarioId: string) => {
    try {
      await deleteComentario(comentarioId);
      await loadComentarios();
      await loadDenuncia();
      toast.success('Comentario eliminado');
    } catch (error) {
      console.error('Error deleting comentario:', error);
      toast.error('Error al eliminar comentario');
    }
  };

  const handleReportar = async ({ comentario }: { comentario: string }) => {
    if (!user || !id) return;
    try {
      await createModeracion({
        denuncia_id: id,
        admin_id: user.id,
        comentario,
        accion: 'en_revision',
      });

      setYaReportado(true);
      toast.success('Reporte enviado correctamente. Será revisado por el equipo de moderación.');
    } catch (error) {
        console.error('Error creating reporte:', error);
        throw error;
    }
};

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (tipo === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    else return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImage = (tipo: string) => tipo.startsWith('image/');

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!denuncia) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Denuncia no encontrada</p>
        </div>
      </div>
    );
  }

  const getEstadoBadge = () => {
    switch (denuncia.estado) {
      case 'activa':
        return <Badge className="bg-success">Activa</Badge>;
      case 'en revisión':
        return <Badge className="bg-warning">En Revisión</Badge>;
      case 'resuelta':
        return <Badge variant="secondary">Resuelta</Badge>;
      default:
        return <Badge variant="outline">{denuncia.estado}</Badge>;
    }
  };
  
  const handleModeracionCreada = () => {
    loadDenuncia(); 
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <Card className="shadow-card-hover mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{denuncia.nombre_asociado}</CardTitle>
                {denuncia.mail_asociado && (
                  <p className="text-muted-foreground">{denuncia.mail_asociado}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getEstadoBadge()}
                
                {/* Menú de opciones */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowReporteModal(true)}
                      disabled={yaReportado}
                      className={cn(
                        "cursor-pointer",
                        yaReportado && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Flag className="h-4 w-4 mr-2 text-orange-600" />
                      <span>{yaReportado ? 'Ya reportado' : 'Reportar denuncia'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground mb-4 whitespace-pre-wrap">{denuncia.descripcion}</p>
            
            {evidencias.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Evidencias adjuntas ({evidencias.length})
                  </h3>
                  
                  {/* Grid de imágenes */}
                  {evidencias.some(e => isImage(e.tipo_archivo)) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {evidencias
                        .filter(e => isImage(e.tipo_archivo))
                        .map((evidencia) => (
                          <div
                            key={evidencia.id}
                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border"
                            onClick={() => setSelectedImage(evidencia.url_storage)}
                          >
                            <img
                              src={evidencia.url_storage}
                              alt={evidencia.nombre_archivo}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                  
                  {/* Lista de otros archivos */}
                  {evidencias.some(e => !isImage(e.tipo_archivo)) && (
                    <div className="space-y-2">
                      {evidencias
                        .filter(e => !isImage(e.tipo_archivo))
                        .map((evidencia) => (
                          <div
                            key={evidencia.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            {getFileIcon(evidencia.tipo_archivo)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {evidencia.nombre_archivo}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(evidencia.tamano)}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(evidencia.url_storage, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                asChild
                              >
                                <a href={evidencia.url_storage} download={evidencia.nombre_archivo}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>
                {new Date(denuncia.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <Separator className="my-4" />

            <div className="flex space-x-4">
              <Button
                variant={isLiked ? 'default' : 'outline'}
                onClick={handleLike}
                aria-label={isLiked ? 'Quitar like a la denuncia' : 'Dar like a la denuncia'}
                className={cn(
                  "space-x-2",
                  isLiked && "bg-destructive hover:bg-destructive/90"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span>{denuncia.likes_count}</span>
              </Button>
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {denuncia.comentarios_count} comentarios
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Comentarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Textarea
                placeholder="Escribe un comentario..."
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                rows={3}
              />
              <Button onClick={handleComentario} disabled={!nuevoComentario.trim()}>
                Comentar
              </Button>
            </div>

            <Separator />

            {comentarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay comentarios aún. ¡Sé el primero en comentar!
              </p>
            ) : (
              <div className="space-y-4">
                {comentarios.map((comentario) => (
                  <div key={comentario.id} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{comentario.users.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comentario.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      {user?.id === comentario.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Eliminar comentario"
                          onClick={() => handleDeleteComentario(comentario.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comentario.contenido}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Evidencia ampliada"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <ReportarDenunciaModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
        denunciaId={id!}
        onReportar={handleReportar}
        onSuccess={handleModeracionCreada}
      />
    </div>
  );
};

export default DetalleDenuncia;