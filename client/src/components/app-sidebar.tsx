import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth"; // Importación correcta
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Bus, 
  FileText, 
  CreditCard, 
  LogOut, 
  Menu 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

// CONFIGURACIÓN DE NAVEGACIÓN
const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard, 
    roles: ['admin', 'driver'] 
  },
  { 
    name: 'Conductores', 
    href: '/drivers', 
    icon: Users, 
    roles: ['admin'] // Solo Admin
  },
  { 
    name: 'Vehículos', 
    href: '/vehicles', 
    icon: Bus, 
    roles: ['admin'] // Solo Admin
  },
  { 
    name: 'Hojas de Ruta', 
    href: '/route-slips', 
    icon: FileText, 
    roles: ['admin', 'driver'] // Admin y Driver
  },
  { 
    name: 'Pagos', 
    href: '/payments', 
    icon: CreditCard, 
    roles: ['admin', 'driver'] // Admin y Driver
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filtrar menú según el rol del usuario conectado
  const filteredNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-border/40">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-primary">Taxi Nort Admin</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-6 bg-muted/10">
        <div className="flex items-center mb-4 px-1 gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
             {/* CORRECCIÓN: Usamos user.name en lugar de user.username */}
             {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate text-foreground">
              {/* CORRECCIÓN: Usamos user.name y user.email */}
              {user?.name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50 bg-background">
        <SidebarContent />
      </div>

      {/* Sidebar Mobile */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
             <SheetTitle className="sr-only">Menu de navegación</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}