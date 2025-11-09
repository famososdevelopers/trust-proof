// src/pages/VerificationSuccess.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const VerificationSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Opcional: redirigir automáticamente después de 3 segundos
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-card-hover text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Shield className="h-16 w-16 text-primary" />
              <CheckCircle className="h-8 w-8 text-green-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            ¡Verificación Exitosa!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Tu cuenta ha sido verificada correctamente. Ya puedes acceder a todas las funcionalidades de VeriTrust.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Ir a la página principal
          </Button>
          <p className="text-sm text-muted-foreground">
            Serás redirigido automáticamente en 3 segundos...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationSuccess;