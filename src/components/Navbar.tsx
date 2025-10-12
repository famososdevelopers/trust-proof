import { Link, useLocation } from 'react-router-dom';
import { Shield, Home, Plus, FileText, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuthStore();
  
  const navItems = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/nueva-denuncia', label: 'Nueva Denuncia', icon: Plus },
    { to: '/mis-denuncias', label: 'Mis Denuncias', icon: FileText },
    ...(isAdmin ? [{ to: '/moderacion', label: 'Moderación', icon: Shield }] : []),
    { to: '/perfil', label: 'Perfil', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">VeriTrust</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={cn(
                        "space-x-2",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
