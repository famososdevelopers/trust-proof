import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, History, FileText, Image, File, UserX, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { fetchDenunciasForModeration, updateDenunciaEstado, type Denuncia } from '@/api/denuncias';
import {
  createModeracion,
  fetchModeracionesPendientes,
  fetchHistorialModeraciones,
  updateModeracion,
  banUserAndDenuncias
} from '@/api/moderaciones';

interface Evidencia {
  id: number;
  denuncia_id: string;
  nombre_archivo: string | null;
  tipo_archivo: string | null;
  tamano: number | null;
  url_storage: string | null;
  created_at: string;
}

interface Moderacion {
  id: string;
  denuncia_id: string;
  admin_id: string;
  accion: string;
  comentario: string | null;
  fecha: string;
  denuncia?: {
    nombre_asociado: string;
    descripcion: string;
    estado: string;
    user_id: string;
  };
  admin?: {
    name: string;
    email: string;
  };
  evidencias?: Evidencia[];
}

const Moderacion = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const [moderacionesPendientes, setModeracionesPendientes] = useState<Moderacion[]>([]);
  const [historial, setHistorial] = useState<Moderacion[]>([]);
  const [comentarioModeracion, setComentarioModeracion] = useState('');
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('moderaciones');
  
  // Evidence viewer state
  const [selectedEvidencias, setSelectedEvidencias] = useState<Evidencia[]>([]);
  const [currentEvidenciaIndex, setCurrentEvidenciaIndex] = useState(0);
  const [evidenciaModalOpen, setEvidenciaModalOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadModeracionesPendientes();
    loadHistorial();
  }, [isAdmin, navigate]);

  const loadModeracionesPendientes = async () => {
    try {
      const data = await fetchModeracionesPendientes();
      setModeracionesPendientes(data);
    } catch (error) {
      console.error('Error fetching moderaciones pendientes:', error);
      toast.error('Error al cargar moderaciones pendientes');
    } finally {
      setLoadingPendientes(false);
    }
  };

  const loadHistorial = async () => {
    try {
      const data = await fetchHistorialModeraciones();
      setHistorial(data);
    } catch (error) {
      console.error('Error fetching historial:', error);
      toast.error('Error al cargar historial de moderaciones');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const getAccionDisplay = (accion: string) => {
    const accionMap: Record<string, string> = {
      'en_revision': 'En Revisión',
      'bajada': 'Bajada',
      'mantener': 'Mantenida',
      'editar': 'Editada',
      'banear_usuario': 'Usuario Baneado',
    };
    return accionMap[accion] || accion;
  };

  const getAccionBadgeVariant = (accion: string) => {
    switch (accion) {
      case 'mantener':
        return 'default';
      case 'en_revision':
        return 'secondary';
      case 'bajada':
      case 'banear_usuario':
        return 'destructive';
      case 'editar':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isImage = (tipo: string | null, nombre: string | null) => {
    if (tipo?.startsWith('image/')) return true;
    if (nombre) {
      const ext = nombre.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
    }
    return false;
  };

  const openEvidenciaViewer = (evidencias: Evidencia[], index: number = 0) => {
    setSelectedEvidencias(evidencias);
    setCurrentEvidenciaIndex(index);
    setEvidenciaModalOpen(true);
  };

  const nextEvidencia = () => {
    setCurrentEvidenciaIndex((prev) => 
      prev < selectedEvidencias.length - 1 ? prev + 1 : 0
    );
  };

  const prevEvidencia = () => {
    setCurrentEvidenciaIndex((prev) => 
      prev > 0 ? prev - 1 : selectedEvidencias.length - 1
    );
  };

  const handleModeracion = async (moderacionId: string, denunciaId: string, accion: string) => {
    if (!user) return;

    setActionLoading(true);

    try {
      await updateModeracion(moderacionId, accion, comentarioModeracion);

      toast.success(`Moderación ${getAccionDisplay(accion).toLowerCase()} exitosamente`);
      setComentarioModeracion('');
      await loadModeracionesPendientes();
      await loadHistorial();
    } catch (error) {
      console.error('Error moderating:', error);
      toast.error('Error al moderar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanearUsuario = async (moderacionId: string, denunciaId: string, userId: string) => {
    if (!user) return;

    setActionLoading(true);

    try {
      await banUserAndDenuncias(moderacionId, userId, comentarioModeracion);

      toast.success('Usuario baneado y denuncias dadas de baja exitosamente');
      setComentarioModeracion('');
      await loadModeracionesPendientes();
      await loadHistorial();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Error al banear usuario');
    } finally {
      setActionLoading(false);
    }
  };

  // Render evidencias thumbnails
  const renderEvidenciasThumbnails = (evidencias: Evidencia[]) => {
    if (!evidencias || evidencias.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t">
        <p className="text-sm text-muted-foreground font-medium mb-2">
          Evidencias ({evidencias.length}):
        </p>
        <div className="flex gap-2 flex-wrap">
          {evidencias.map((evidencia, index) => (
            <button
              key={evidencia.id}
              onClick={() => openEvidenciaViewer(evidencias, index)}
              className="relative group w-16 h-16 rounded-md overflow-hidden border hover:border-primary transition-colors"
            >
              {isImage(evidencia.tipo_archivo, evidencia.nombre_archivo) ? (
                <img
                  src={evidencia.url_storage || ''}
                  alt={evidencia.nombre_archivo || 'Evidencia'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <File className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Image className="h-4 w-4 text-white" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render a moderation card (used in both tabs)
  const renderModeracionCard = (moderacion: Moderacion, showActions: boolean = false) => (
    <Card key={moderacion.id} className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg">
                {moderacion.denuncia?.nombre_asociado || 'Denuncia eliminada'}
              </CardTitle>
              <Badge variant={getAccionBadgeVariant(moderacion.accion)}>
                {getAccionDisplay(moderacion.accion)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Moderado por: {moderacion.admin?.name || 'Admin desconocido'}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {new Date(moderacion.fecha).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {moderacion.denuncia?.descripcion && (
          <p className="text-sm text-foreground mb-3 line-clamp-2">
            {moderacion.denuncia.descripcion}
          </p>
        )}
        {moderacion.comentario && (
          <div className="bg-muted p-3 rounded-md mb-3">
            <p className="text-sm text-muted-foreground font-medium mb-1">
              Comentario:
            </p>
            <p className="text-sm text-foreground">{moderacion.comentario}</p>
          </div>
        )}
        {moderacion.denuncia?.estado && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Estado actual de la denuncia:</span>
            <Badge variant="outline">{moderacion.denuncia.estado}</Badge>
          </div>
        )}

        {/* Evidencias thumbnails */}
        {renderEvidenciasThumbnails(moderacion.evidencias || [])}

        {/* Action buttons only for pending moderations */}
        {showActions && (
          <div className="flex gap-2 flex-wrap pt-4 mt-4 border-t">
            {/* Mantener */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-success text-success hover:bg-success hover:text-success-foreground"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mantener
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mantener Denuncia</DialogTitle>
                  <DialogDescription>
                    La denuncia se mantendrá activa en la plataforma
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor={`comentario-mantener-${moderacion.id}`}>Comentario (opcional)</Label>
                    <Textarea
                      id={`comentario-mantener-${moderacion.id}`}
                      placeholder="Agrega un comentario sobre esta decisión..."
                      value={comentarioModeracion}
                      onChange={(e) => setComentarioModeracion(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setComentarioModeracion('')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-success hover:bg-success/90"
                    onClick={() => handleModeracion(moderacion.id, moderacion.denuncia_id, 'mantener')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Procesando...' : 'Mantener'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Bajar */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Bajar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bajar Denuncia</DialogTitle>
                  <DialogDescription>
                    La denuncia será removida de la plataforma
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor={`comentario-bajar-${moderacion.id}`}>Comentario (opcional)</Label>
                    <Textarea
                      id={`comentario-bajar-${moderacion.id}`}
                      placeholder="Agrega un comentario sobre esta decisión..."
                      value={comentarioModeracion}
                      onChange={(e) => setComentarioModeracion(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setComentarioModeracion('')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleModeracion(moderacion.id, moderacion.denuncia_id, 'bajada')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Procesando...' : 'Bajar Denuncia'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Banear Usuario */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Banear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Banear Usuario</DialogTitle>
                  <DialogDescription>
                    El usuario será baneado y todas sus denuncias serán dadas de baja. Esta acción es severa.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Advertencia: Esta acción baneará permanentemente al usuario y eliminará todas sus denuncias de la plataforma.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`comentario-banear-${moderacion.id}`}>Motivo del baneo (recomendado)</Label>
                    <Textarea
                      id={`comentario-banear-${moderacion.id}`}
                      placeholder="Explica el motivo del baneo..."
                      value={comentarioModeracion}
                      onChange={(e) => setComentarioModeracion(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setComentarioModeracion('')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleBanearUsuario(moderacion.id, moderacion.denuncia_id, moderacion.denuncia?.user_id || '')}
                    disabled={actionLoading || !moderacion.denuncia?.user_id}
                  >
                    {actionLoading ? 'Procesando...' : 'Banear Usuario'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="moderaciones" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Moderaciones ({moderacionesPendientes.length})
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial ({historial.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Moderaciones Pendientes (en_revision) */}
          <TabsContent value="moderaciones">
            {loadingPendientes ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando moderaciones...</p>
              </div>
            ) : moderacionesPendientes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay moderaciones pendientes de revisión
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {moderacionesPendientes.map((moderacion) => renderModeracionCard(moderacion, true))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Historial de Moderaciones (no en_revision) */}
          <TabsContent value="historial">
            {loadingHistorial ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando historial...</p>
              </div>
            ) : historial.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay moderaciones en el historial
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {historial.map((moderacion) => renderModeracionCard(moderacion, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Evidence Viewer Modal */}
      <Dialog open={evidenciaModalOpen} onOpenChange={setEvidenciaModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>
                Evidencia {currentEvidenciaIndex + 1} de {selectedEvidencias.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEvidenciaModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            {selectedEvidencias[currentEvidenciaIndex]?.nombre_archivo && (
              <DialogDescription>
                {selectedEvidencias[currentEvidenciaIndex].nombre_archivo}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="relative flex items-center justify-center p-4 min-h-[400px]">
            {selectedEvidencias.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 z-10"
                onClick={prevEvidencia}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="flex items-center justify-center w-full max-h-[60vh]">
              {selectedEvidencias[currentEvidenciaIndex] && (
                isImage(
                  selectedEvidencias[currentEvidenciaIndex].tipo_archivo,
                  selectedEvidencias[currentEvidenciaIndex].nombre_archivo
                ) ? (
                  <img
                    src={selectedEvidencias[currentEvidenciaIndex].url_storage || ''}
                    alt={selectedEvidencias[currentEvidenciaIndex].nombre_archivo || 'Evidencia'}
                    className="max-w-full max-h-[60vh] object-contain rounded-md"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-md">
                    <File className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedEvidencias[currentEvidenciaIndex].nombre_archivo}
                    </p>
                    <a
                      href={selectedEvidencias[currentEvidenciaIndex].url_storage || ''}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Descargar archivo
                    </a>
                  </div>
                )
              )}
            </div>

            {selectedEvidencias.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 z-10"
                onClick={nextEvidencia}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Thumbnails navigation */}
          {selectedEvidencias.length > 1 && (
            <div className="flex gap-2 justify-center p-4 pt-0 overflow-x-auto">
              {selectedEvidencias.map((evidencia, index) => (
                <button
                  key={evidencia.id}
                  onClick={() => setCurrentEvidenciaIndex(index)}
                  className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-colors flex-shrink-0 ${
                    index === currentEvidenciaIndex 
                      ? 'border-primary' 
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                >
                  {isImage(evidencia.tipo_archivo, evidencia.nombre_archivo) ? (
                    <img
                      src={evidencia.url_storage || ''}
                      alt={evidencia.nombre_archivo || 'Evidencia'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <File className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moderacion;