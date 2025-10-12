import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Denuncia {
  id: string;
  nombre_asociado: string;
  mail_asociado: string | null;
  descripcion: string;
  estado: string;
  likes_count: number;
  comentarios_count: number;
  created_at: string;
  user_id: string;
}

interface Comentario {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string;
  users: {
    name: string;
  };
}

const DetalleDenuncia = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [denuncia, setDenuncia] = useState<Denuncia | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDenuncia();
      fetchComentarios();
      if (user) {
        checkLikeStatus();
      }
    }
  }, [id, user]);

  const fetchDenuncia = async () => {
    try {
      const { data, error } = await supabase
        .from('denuncias')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDenuncia(data);
    } catch (error) {
      console.error('Error fetching denuncia:', error);
      toast.error('Error al cargar la denuncia');
    } finally {
      setLoading(false);
    }
  };

  const fetchComentarios = async () => {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select('*, users(name)')
        .eq('denuncia_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('denuncia_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('denuncia_id', id)
          .eq('user_id', user.id);
        setIsLiked(false);
      } else {
        await supabase
          .from('likes')
          .insert({ denuncia_id: id!, user_id: user.id });
        setIsLiked(true);
      }
      await fetchDenuncia();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al procesar el like');
    }
  };

  const handleComentario = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }

    if (!nuevoComentario.trim()) {
      toast.error('Escribe un comentario');
      return;
    }

    try {
      const { error } = await supabase.from('comentarios').insert({
        denuncia_id: id!,
        user_id: user.id,
        contenido: nuevoComentario.trim(),
      });

      if (error) throw error;

      setNuevoComentario('');
      await fetchComentarios();
      await fetchDenuncia();
      toast.success('Comentario agregado');
    } catch (error) {
      console.error('Error adding comentario:', error);
      toast.error('Error al agregar comentario');
    }
  };

  const handleDeleteComentario = async (comentarioId: string) => {
    try {
      const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', comentarioId);

      if (error) throw error;

      await fetchComentarios();
      await fetchDenuncia();
      toast.success('Comentario eliminado');
    } catch (error) {
      console.error('Error deleting comentario:', error);
      toast.error('Error al eliminar comentario');
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
              <div>
                <CardTitle className="text-2xl mb-2">{denuncia.nombre_asociado}</CardTitle>
                {denuncia.mail_asociado && (
                  <p className="text-muted-foreground">{denuncia.mail_asociado}</p>
                )}
              </div>
              {getEstadoBadge()}
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
    </div>
  );
};

export default DetalleDenuncia;
