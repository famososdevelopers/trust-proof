import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Calendar, FileText, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface UserProfile {
  name: string;
  email: string;
  created_at: string;
  role: string;
}

interface Stats {
  denuncias: number;
  comentarios: number;
  likes: number;
}

const Perfil = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ denuncias: 0, comentarios: 0, likes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const [denunciasRes, comentariosRes, likesRes] = await Promise.all([
        supabase.from('denuncias').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('comentarios').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('likes').select('id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      setStats({
        denuncias: denunciasRes.count || 0,
        comentarios: comentariosRes.count || 0,
        likes: likesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">No se pudo cargar el perfil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Información de tu cuenta y actividad</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card-hover">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Datos de tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Nombre</p>
                  <p className="text-sm text-muted-foreground">{profile.name}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Miembro desde</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              
              {profile.role === 'admin' && (
                <>
                  <Separator />
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-primary">
                      👑 Administrador
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card-hover">
            <CardHeader>
              <CardTitle>Estadísticas de Actividad</CardTitle>
              <CardDescription>Tu participación en VeriTrust</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Denuncias creadas</p>
                    <p className="text-2xl font-bold text-primary">{stats.denuncias}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium">Comentarios escritos</p>
                    <p className="text-2xl font-bold text-accent">{stats.comentarios}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 text-destructive">❤️</div>
                  <div>
                    <p className="text-sm font-medium">Likes dados</p>
                    <p className="text-2xl font-bold text-destructive">{stats.likes}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
