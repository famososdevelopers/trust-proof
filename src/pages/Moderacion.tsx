import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Denuncia {
  id: string;
  nombre_asociado: string;
  mail_asociado: string | null;
  descripcion: string;
  estado: string;
  likes_count: number;
  comentarios_count: number;
  created_at: string;
}

const Moderacion = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [selectedDenuncia, setSelectedDenuncia] = useState<Denuncia | null>(null);
  const [comentarioModeracion, setComentarioModeracion] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchDenunciasModeracion();
  }, [isAdmin, navigate]);

  const fetchDenunciasModeracion = async () => {
    try {
      const { data, error } = await supabase
        .from('denuncias')
        .select('*')
        .in('estado', ['en revisión', 'activa'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDenuncias(data || []);
    } catch (error) {
      console.error('Error fetching denuncias:', error);
      toast.error('Error al cargar denuncias');
    } finally {
      setLoading(false);
    }
  };

  const handleModeracion = async (denunciaId: string, accion: string, nuevoEstado: string) => {
    if (!user) return;
    
    setActionLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('denuncias')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', denunciaId);

      if (updateError) throw updateError;

      const { error: moderacionError } = await supabase
        .from('moderaciones')
        .insert({
          denuncia_id: denunciaId,
          admin_id: user.id,
          accion,
          comentario: comentarioModeracion || null,
        });

      if (moderacionError) throw moderacionError;

      toast.success(`Denuncia ${accion.toLowerCase()} exitosamente`);
      setSelectedDenuncia(null);
      setComentarioModeracion('');
      await fetchDenunciasModeracion();
    } catch (error) {
      console.error('Error moderating denuncia:', error);
      toast.error('Error al moderar la denuncia');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center space-x-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Panel de Moderación</h1>
            <p className="text-muted-foreground">Gestiona y modera las denuncias reportadas</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando denuncias...</p>
          </div>
        ) : denuncias.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay denuncias pendientes de moderación
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {denuncias.map((denuncia) => (
              <Card key={denuncia.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{denuncia.nombre_asociado}</CardTitle>
                        <Badge variant={denuncia.estado === 'en revisión' ? 'default' : 'secondary'} className={denuncia.estado === 'en revisión' ? 'bg-warning' : ''}>
                          {denuncia.estado}
                        </Badge>
                      </div>
                      {denuncia.mail_asociado && (
                        <p className="text-sm text-muted-foreground">{denuncia.mail_asociado}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground mb-4 whitespace-pre-wrap">
                    {denuncia.descripcion}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>{denuncia.likes_count} likes</span>
                    <span>{denuncia.comentarios_count} comentarios</span>
                    <span>
                      {new Date(denuncia.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDenuncia(denuncia)}
                          className="border-success text-success hover:bg-success hover:text-success-foreground"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Aprobar Denuncia</DialogTitle>
                          <DialogDescription>
                            La denuncia se mantendrá activa en la plataforma
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="comentario">Comentario (opcional)</Label>
                            <Textarea
                              id="comentario"
                              placeholder="Agrega un comentario sobre esta decisión..."
                              value={comentarioModeracion}
                              onChange={(e) => setComentarioModeracion(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedDenuncia(null);
                              setComentarioModeracion('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            className="bg-success hover:bg-success/90"
                            onClick={() => handleModeracion(denuncia.id, 'Aprobada', 'activa')}
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Procesando...' : 'Aprobar'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDenuncia(denuncia)}
                          className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Revisar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Marcar en Revisión</DialogTitle>
                          <DialogDescription>
                            La denuncia requiere más análisis
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="comentario">Comentario (opcional)</Label>
                            <Textarea
                              id="comentario"
                              placeholder="Agrega un comentario sobre esta decisión..."
                              value={comentarioModeracion}
                              onChange={(e) => setComentarioModeracion(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedDenuncia(null);
                              setComentarioModeracion('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            className="bg-warning hover:bg-warning/90"
                            onClick={() => handleModeracion(denuncia.id, 'En revisión', 'en revisión')}
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Procesando...' : 'Marcar en Revisión'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDenuncia(denuncia)}
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Resolver
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolver Denuncia</DialogTitle>
                          <DialogDescription>
                            La denuncia se marcará como resuelta
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="comentario">Comentario (opcional)</Label>
                            <Textarea
                              id="comentario"
                              placeholder="Agrega un comentario sobre esta decisión..."
                              value={comentarioModeracion}
                              onChange={(e) => setComentarioModeracion(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedDenuncia(null);
                              setComentarioModeracion('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleModeracion(denuncia.id, 'Resuelta', 'resuelta')}
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Procesando...' : 'Resolver'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Moderacion;
