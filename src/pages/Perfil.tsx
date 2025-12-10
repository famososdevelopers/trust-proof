import { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Calendar,
  FileText,
  MessageCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { fetchUserProfile, type UserProfile } from '@/api/users';
import { countDenunciasByUserId } from '@/api/denuncias';
import { countComentariosByUserId } from '@/api/comentarios';
import { countLikesByUserId } from '@/api/likes';

interface Stats {
  denuncias: number;
  comentarios: number;
  likes: number;
}

const Perfil = () => {
  const { user, initialized } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({
    denuncias: 0,
    comentarios: 0,
    likes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esperar a que la autenticación esté inicializada antes de cargar datos
    if (!initialized) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const data = await fetchUserProfile(user.id);

        if (!mounted) return;

        setProfile(data);
      } catch (error) {
        console.error('[Perfil] Error fetching profile:', error);
        if (mounted) {
          toast.error('Error al cargar el perfil');
        }
      }
    };

    const loadStats = async () => {
      if (!user?.id) return;

      try {
        const [denuncias, comentarios, likes] = await Promise.all([
          countDenunciasByUserId(user.id),
          countComentariosByUserId(user.id),
          countLikesByUserId(user.id),
        ]);

        if (!mounted) return;

        setStats({
          denuncias,
          comentarios,
          likes,
        });
      } catch (error) {
        console.error('[Perfil] Error fetching stats:', error);
      }
    };

    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await Promise.all([loadProfile(), loadStats()]);
      } catch (error) {
        console.error('[Perfil] Error loading data:', error);
        // Reintentar una vez después de un breve delay
        if (mounted && user?.id) {
          setTimeout(async () => {
            if (mounted) {
              try {
                await Promise.all([loadProfile(), loadStats()]);
              } catch (retryError) {
                console.error('[Perfil] Error on retry:', retryError);
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
  }, [initialized, user?.id]); // Esperar inicialización antes de cargar

  if (loading) {
    return (
      <div className='min-h-screen bg-background'>
        <Navbar />
        <div className='max-w-4xl mx-auto px-4 py-8'>
          <p className='text-center text-muted-foreground'>
            Cargando perfil...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className='min-h-screen bg-background'>
        <Navbar />
        <div className='max-w-4xl mx-auto px-4 py-8'>
          <p className='text-center text-muted-foreground'>
            No se pudo cargar el perfil
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>Mi Perfil</h1>
          <p className='text-muted-foreground'>
            Información de tu cuenta y actividad
          </p>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <Card className='shadow-card-hover'>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Datos de tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center space-x-3'>
                <UserIcon className='h-5 w-5 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Nombre</p>
                  <p className='text-sm text-muted-foreground'>
                    {profile.name}
                  </p>
                </div>
              </div>

              <Separator />

              <div className='flex items-center space-x-3'>
                <Mail className='h-5 w-5 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Email</p>
                  <p className='text-sm text-muted-foreground'>
                    {profile.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className='flex items-center space-x-3'>
                <Calendar className='h-5 w-5 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Miembro desde</p>
                  <p className='text-sm text-muted-foreground'>
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
                  <div className='bg-primary/10 p-3 rounded-lg'>
                    <p className='text-sm font-semibold text-primary'>
                      👑 Administrador
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className='shadow-card-hover'>
            <CardHeader>
              <CardTitle>Estadísticas de Actividad</CardTitle>
              <CardDescription>Tu participación en VeriTrust</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between p-4 bg-gradient-card rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <FileText className='h-5 w-5 text-primary' />
                  <div>
                    <p className='text-sm font-medium'>Denuncias creadas</p>
                    <p className='text-2xl font-bold text-primary'>
                      {stats.denuncias}
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between p-4 bg-gradient-card rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <MessageCircle className='h-5 w-5 text-accent' />
                  <div>
                    <p className='text-sm font-medium'>Comentarios escritos</p>
                    <p className='text-2xl font-bold text-accent'>
                      {stats.comentarios}
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between p-4 bg-gradient-card rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <div className='h-5 w-5 text-destructive'>❤️</div>
                  <div>
                    <p className='text-sm font-medium'>Likes dados</p>
                    <p className='text-2xl font-bold text-destructive'>
                      {stats.likes}
                    </p>
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
