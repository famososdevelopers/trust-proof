import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Flag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ReportarDenunciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  denunciaId: string;
  onReportar: (data: { comentario: string }) => Promise<void>;
  onSuccess?: () => void;
}

export default function ReportarDenunciaModal({ 
  isOpen, 
  onClose, 
  denunciaId, 
  onReportar,
  onSuccess
}: ReportarDenunciaModalProps) {
  const [comentario, setComentario] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (!comentario.trim() || comentario.trim().length < 20) {
      toast.error('Por favor proporciona un comentario de al menos 20 caracteres explicando el motivo del reporte');
      return;
    }

    setIsSubmitting(true);

    // Lógica para enviar el reporte
    try {
      await onReportar({ comentario: comentario.trim() });
      // Limpiar form y cerrar
      setComentario('');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
        toast.error('Error al enviar el reporte. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComentario('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-600" />
            Reportar Denuncia
          </DialogTitle>
          <DialogDescription>
            Reporta esta denuncia si consideras que contiene información falsa, 
            lenguaje inapropiado o viola las políticas de la plataforma.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comentario">
              Motivo del reporte * 
              <span className="text-sm text-muted-foreground ml-2">(mínimo 20 caracteres)</span>
            </Label>
            <Textarea
              id="comentario"
              placeholder="Explica detalladamente por qué consideras que esta denuncia debe ser revisada. Por ejemplo: contiene información falsa, lenguaje ofensivo, datos incorrectos, etc."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {comentario.length} / 20 caracteres mínimos
            </p>
          </div>

          <div className="bg-secondary dark:bg-secondary border border-primary dark:border-primary rounded-lg p-3">
            <p className="text-sm text-primary dark:text-primary">
              <strong>Nota:</strong> Tu reporte será revisado por el equipo de moderación. 
              Proporciona la mayor cantidad de detalles posibles para facilitar la revisión.
            </p>
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || comentario.length < 20}

              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}