import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Verifica tu Email
          </CardTitle>
          <CardDescription>
            Te hemos enviado un email de verificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Por favor revisa tu bandeja de entrada y haz clic en el link de verificación para activar tu cuenta.
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Una vez verificada tu cuenta, podrás iniciar sesión en VeriTrust.
          </p>
          <div className="pt-4">
            <Button onClick={() => navigate('/auth')} className="w-full">
              Ir a Iniciar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
