import { Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DenunciaCardProps {
  id: string;
  nombre_asociado: string;
  mail_asociado: string | null;
  descripcion: string;
  estado: string;
  likes_count: number;
  comentarios_count: number;
  created_at: string;
  isLiked?: boolean;
  onLike?: () => void;
}

const DenunciaCard = ({
  id,
  nombre_asociado,
  mail_asociado,
  descripcion,
  estado,
  likes_count,
  comentarios_count,
  created_at,
  isLiked,
  onLike,
}: DenunciaCardProps) => {
  const navigate = useNavigate();

  const getEstadoBadge = () => {
    switch (estado) {
      case 'activa':
        return <Badge variant="default" className="bg-success">Activa</Badge>;
      case 'en revisión':
        return <Badge variant="default" className="bg-warning">En Revisión</Badge>;
      case 'resuelta':
        return <Badge variant="secondary">Resuelta</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-card-hover transition-all duration-300 cursor-pointer bg-gradient-card">
      <CardHeader onClick={() => navigate(`/denuncia/${id}`)}>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{nombre_asociado}</CardTitle>
          {getEstadoBadge()}
        </div>
        {mail_asociado && (
          <p className="text-sm text-muted-foreground">{mail_asociado}</p>
        )}
      </CardHeader>
      <CardContent onClick={() => navigate(`/denuncia/${id}`)}>
        <p className="text-sm text-foreground line-clamp-3">{descripcion}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.();
            }}
            className={cn(
              "space-x-1",
              isLiked && "text-destructive"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            <span>{likes_count}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/denuncia/${id}`)}
            className="space-x-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{comentarios_count}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DenunciaCard;
