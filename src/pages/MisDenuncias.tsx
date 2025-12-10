import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import {
  fetchDenunciasByUserId,
  deleteDenuncia,
  type Denuncia,
} from '@/api/denuncias';

const MisDenuncias = () => {
  const navigate = useNavigate();
  const { user, initialized } = useAuthStore();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref para acceder al estado actual de loading en el listener
  const loadingRef = useRef(loading);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    // Esperar a que la autenticación esté inicializada antes de cargar datos
    if (!initialized) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      setLoading(true);
      loadingRef.current = true;

      try {
        const data = await fetchDenunciasByUserId(user.id);

        if (!mounted) return;

        setDenuncias(data);
      } catch (error) {
        console.error('[MisDenuncias] Error fetching denuncias:', error);
        // Reintentar una vez después de un breve delay
        if (mounted) {
          setTimeout(async () => {
            if (mounted && user?.id) {
              try {
                const data = await fetchDenunciasByUserId(user.id);
                setDenuncias(data);
              } catch (retryError) {
                toast.error('Error al cargar tus denuncias');
                setLoading(false);
                loadingRef.current = false;
              }
            }
          }, 1000);
        } else {
          if (mounted) {
            toast.error('Error al cargar tus denuncias');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          loadingRef.current = false;
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

    // Reintentar carga cuando la página vuelve a ser visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        // Si todavía está en loading después de volver, forzar a false
        setTimeout(() => {
          if (mounted && loadingRef.current) {
            setLoading(false);
            loadingRef.current = false;
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialized, user?.id]); // Esperar inicialización antes de cargar

  const handleDelete = async (id: string) => {
    try {
      await deleteDenuncia(id);
      toast.success('Denuncia eliminada');

      // Recargar las denuncias
      if (user?.id) {
        const data = await fetchDenunciasByUserId(user.id);
        setDenuncias(data);
      }
    } catch (error) {
      console.error('Error deleting denuncia:', error);
      toast.error('Error al eliminar la denuncia');
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge className='bg-success'>Activa</Badge>;
      case 'en revisión':
        return <Badge className='bg-warning'>En Revisión</Badge>;
      case 'resuelta':
        return <Badge variant='secondary'>Resuelta</Badge>;
      default:
        return <Badge variant='outline'>{estado}</Badge>;
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            Mis Denuncias
          </h1>
          <p className='text-muted-foreground'>
            Gestiona las denuncias que has creado
          </p>
        </div>

        {loading ? (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>Cargando tus denuncias...</p>
          </div>
        ) : denuncias.length === 0 ? (
          <Card>
            <CardContent className='text-center py-12'>
              <p className='text-muted-foreground mb-4'>
                Aún no has creado ninguna denuncia
              </p>
              <Button onClick={() => navigate('/nueva-denuncia')}>
                Crear primera denuncia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {denuncias.map((denuncia) => (
              <Card
                key={denuncia.id}
                className='shadow-card hover:shadow-card-hover transition-shadow'
              >
                <CardHeader>
                  <div className='flex justify-between items-start'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        <CardTitle className='text-xl'>
                          {denuncia.nombre_asociado}
                        </CardTitle>
                        {getEstadoBadge(denuncia.estado)}
                      </div>
                      {denuncia.mail_asociado && (
                        <CardDescription>
                          {denuncia.mail_asociado}
                        </CardDescription>
                      )}
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() =>
                          navigate(`/editar-denuncia/${denuncia.id}`)
                        }
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <Trash2 className='h-4 w-4 text-destructive' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              ¿Eliminar denuncia?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. La denuncia y
                              todos sus comentarios serán eliminados
                              permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(denuncia.id)}
                              className='bg-destructive hover:bg-destructive/90'
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
                  <p className='text-sm text-foreground line-clamp-2 mb-4'>
                    {denuncia.descripcion}
                  </p>
                  <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                    <span>{denuncia.likes_count} likes</span>
                    <span>{denuncia.comentarios_count} comentarios</span>
                    {denuncia.evidencias.length > 0 && (
                      <span className='flex items-center gap-1'>
                        <Paperclip className='h-3 w-3' />
                        {denuncia.evidencias.length} archivo
                        {denuncia.evidencias.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span>
                      {new Date(denuncia.created_at).toLocaleDateString(
                        'es-ES'
                      )}
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
