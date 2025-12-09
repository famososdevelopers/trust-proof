import { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DenunciaCard from '@/components/DenunciaCard';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { fetchDenuncias, type Denuncia } from '@/api/denuncias';
import { fetchUserLikes, toggleLike } from '@/api/likes';

const Home = () => {
  const { user, initialized } = useAuthStore();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [filteredDenuncias, setFilteredDenuncias] = useState<Denuncia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Ref para acceder al estado actual de loading en el listener
  const loadingRef = useRef(loading);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const loadDenuncias = useCallback(async () => {
    try {
      const data = await fetchDenuncias();
      setDenuncias(data);
      setFilteredDenuncias(data);
    } catch (error) {
      const err = error as { message?: string; name?: string };
      // Solo mostrar toast si no es un error de red/cancelación
      if (err?.name !== 'AbortError' && !err?.message?.includes('fetch')) {
        toast.error('Error al cargar las denuncias');
      }
      throw error; // Re-lanzar para que el catch superior lo maneje
    }
  }, []);

  const loadUserLikes = useCallback(async () => {
    if (!user?.id) return;

    try {
      const likedIds = await fetchUserLikes(user.id);
      setUserLikes(likedIds);
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  }, [user?.id]);

  const filterDenuncias = useCallback(() => {
    let filtered = [...denuncias];

    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.nombre_asociado.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.mail_asociado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'all') {
      filtered = filtered.filter((d) => d.estado === estadoFilter);
    }

    setFilteredDenuncias(filtered);
  }, [denuncias, searchTerm, estadoFilter]);

  useEffect(() => {
    // Esperar a que la autenticación esté inicializada antes de cargar datos
    if (!initialized) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadData = async () => {
      setLoading(true);
      loadingRef.current = true;

      try {
        await loadDenuncias();
        if (user?.id && mounted) {
          await loadUserLikes();
        }
      } catch (error) {
        console.error('[Home] Error loading data:', error);
        // Reintentar una vez después de un breve delay
        if (mounted) {
          setTimeout(async () => {
            if (mounted) {
              try {
                await loadDenuncias();
                if (user?.id) {
                  await loadUserLikes();
                }
              } catch (retryError) {
                console.error('[Home] Error on retry:', retryError);
                setLoading(false);
                loadingRef.current = false;
              }
            }
          }, 1000);
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
  }, [initialized, user?.id, loadDenuncias, loadUserLikes]);

  useEffect(() => {
    filterDenuncias();
  }, [filterDenuncias]);

  const handleLike = async (denunciaId: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para dar like');
      return;
    }

    const isLiked = userLikes.has(denunciaId);

    try {
      await toggleLike(denunciaId, user.id, isLiked);

      // Actualizar estado local
      setUserLikes((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(denunciaId);
        } else {
          newSet.add(denunciaId);
        }
        return newSet;
      });

      // Actualizar el conteo localmente sin recargar todo
      setDenuncias((prev) =>
        prev.map((d) =>
          d.id === denunciaId
            ? {
                ...d,
                likes_count: isLiked
                  ? Math.max(0, d.likes_count - 1)
                  : d.likes_count + 1,
              }
            : d
        )
      );
      setFilteredDenuncias((prev) =>
        prev.map((d) =>
          d.id === denunciaId
            ? {
                ...d,
                likes_count: isLiked
                  ? Math.max(0, d.likes_count - 1)
                  : d.likes_count + 1,
              }
            : d
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al procesar el like');
      // En caso de error, recargar para sincronizar
      await loadDenuncias();
      if (user?.id) {
        await loadUserLikes();
      }
    }
  };

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            Denuncias Verificadas
          </h1>
          <p className='text-muted-foreground'>
            Plataforma de transparencia y confianza entre particulares
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-4 mb-6'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Buscar por nombre, email o descripción...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>

          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className='w-full sm:w-[200px]'>
              <SelectValue placeholder='Estado' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todos</SelectItem>
              <SelectItem value='activa'>Activa</SelectItem>
              <SelectItem value='en revisión'>En Revisión</SelectItem>
              <SelectItem value='resuelta'>Resuelta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>Cargando denuncias...</p>
          </div>
        ) : filteredDenuncias.length === 0 ? (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>No se encontraron denuncias</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredDenuncias.map((denuncia) => (
              <DenunciaCard
                key={denuncia.id}
                {...denuncia}
                isLiked={userLikes.has(denuncia.id)}
                onLike={() => handleLike(denuncia.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
