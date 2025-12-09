import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ArrowLeft, Trash2, MoreVertical, Flag } from 'lucide-react';
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
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [yaReportado, setYaReportado] = useState(false);

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