import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

const MisDenuncias = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMisDenuncias();
    }
  }, [user]);

  const fetchMisDenuncias = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('denuncias')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDenuncias(data || []);
    } catch (error) {
      console.error('Error fetching denuncias:', error);
      toast.error('Error al cargar tus denuncias');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('denuncias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Denuncia eliminada');
      await fetchMisDenuncias();
    } catch (error) {
      console.error('Error deleting denuncia:', error);
      toast.error('Error al eliminar la denuncia');
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge className="bg-success">Activa</Badge>;
      case 'en revisión':
        return <Badge className="bg-warning">En Revisión</Badge>;
      case 'resuelta':
        return <Badge variant="secondary">Resuelta</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mis Denuncias</h1>
          <p className="text-muted-foreground">
            Gestiona las denuncias que has creado
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando tus denuncias...</p>
          </div>
        ) : denuncias.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Aún no has creado ninguna denuncia
              </p>
              <Button onClick={() => navigate('/nueva-denuncia')}>
                Crear primera denuncia
              </Button>
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
                        {getEstadoBadge(denuncia.estado)}
                      </div>
                      {denuncia.mail_asociado && (
                        <CardDescription>{denuncia.mail_asociado}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/denuncia/${denuncia.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar denuncia?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. La denuncia y todos sus
                              comentarios serán eliminados permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(denuncia.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground line-clamp-2 mb-4">
                    {denuncia.descripcion}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{denuncia.likes_count} likes</span>
                    <span>{denuncia.comentarios_count} comentarios</span>
                    <span>
                      {new Date(denuncia.created_at).toLocaleDateString('es-ES')}
                    </span>
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

export default MisDenuncias;
