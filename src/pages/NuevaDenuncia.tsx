import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { z } from 'zod';

const denunciaSchema = z.object({
  nombre_asociado: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  mail_asociado: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000),
});

const NuevaDenuncia = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_asociado: '',
    mail_asociado: '',
    descripcion: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }

    setLoading(true);

    try {
      const validatedData = denunciaSchema.parse(formData);

      const { error } = await supabase.from('denuncias').insert({
        user_id: user.id,
        nombre_asociado: validatedData.nombre_asociado,
        mail_asociado: validatedData.mail_asociado || null,
        descripcion: validatedData.descripcion,
        estado: 'activa',
      });

      if (error) throw error;

      toast.success('Denuncia creada exitosamente');
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error('Error creating denuncia:', error);
        toast.error('Error al crear la denuncia');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-card-hover">
          <CardHeader>
            <CardTitle className="text-2xl">Nueva Denuncia</CardTitle>
            <CardDescription>
              Registra una nueva denuncia de manera segura y verificada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nombre_asociado">
                  Nombre de la persona o entidad denunciada *
                </Label>
                <Input
                  id="nombre_asociado"
                  placeholder="Ej: Juan Pérez / Empresa XYZ"
                  value={formData.nombre_asociado}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre_asociado: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mail_asociado">
                  Email asociado (opcional)
                </Label>
                <Input
                  id="mail_asociado"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.mail_asociado}
                  onChange={(e) =>
                    setFormData({ ...formData, mail_asociado: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">
                  Descripción de la denuncia *
                </Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe detalladamente los hechos que motivan esta denuncia..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.descripcion.length}/1000 caracteres
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creando...' : 'Crear Denuncia'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NuevaDenuncia;
