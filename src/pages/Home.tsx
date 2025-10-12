import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DenunciaCard from '@/components/DenunciaCard';
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

const Home = () => {
  const { user } = useAuthStore();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [filteredDenuncias, setFilteredDenuncias] = useState<Denuncia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDenuncias();
    if (user) {
      fetchUserLikes();
    }
  }, [user]);

  useEffect(() => {
    filterDenuncias();
  }, [searchTerm, estadoFilter, denuncias]);

  const fetchDenuncias = async () => {
    try {
      const { data, error } = await supabase
        .from('denuncias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDenuncias(data || []);
      setFilteredDenuncias(data || []);
    } catch (error) {
      console.error('Error fetching denuncias:', error);
      toast.error('Error al cargar las denuncias');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('denuncia_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const likedIds = new Set(data?.map((like) => like.denuncia_id) || []);
      setUserLikes(likedIds);
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  };

  const filterDenuncias = () => {
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
  };

  const handleLike = async (denunciaId: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para dar like');
      return;
    }

    const isLiked = userLikes.has(denunciaId);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('denuncia_id', denunciaId)
          .eq('user_id', user.id);

        if (error) throw error;

        setUserLikes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(denunciaId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ denuncia_id: denunciaId, user_id: user.id });

        if (error) throw error;

        setUserLikes((prev) => new Set(prev).add(denunciaId));
      }

      await fetchDenuncias();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Error al procesar el like');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Denuncias Verificadas</h1>
          <p className="text-muted-foreground">
            Plataforma de transparencia y confianza entre particulares
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="en revisión">En Revisión</SelectItem>
              <SelectItem value="resuelta">Resuelta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando denuncias...</p>
          </div>
        ) : filteredDenuncias.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron denuncias</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
