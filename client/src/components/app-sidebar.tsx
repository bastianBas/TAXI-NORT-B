import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign, Menu, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle"; // Asegúrate de tener este componente o quítalo si da error

// CONFIGURACIÓN DEL MENÚ
const items = [
  { title: "Dashboard", url: "/", icon: Home, roles: [] },
  { title: "Conductores", url: "/drivers", icon: Users, roles: ["admin", "operator"] },
  { title: "Vehículos", url: "/vehicles", icon: Truck, roles: ["admin", "operator"] },
  { title: "Hojas de Ruta", url: "/route-slips", icon: FileText, roles: ["admin", "operator", "driver", "finance"] },
  { title: "Pagos", url: "/payments", icon: DollarSign, roles: ["admin", "finance", "driver"] },
  { title: "Auditoría", url: "/audit", icon: ShieldCheck, roles: ["admin"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const filteredItems = items.filter(item => 
    !(item.roles.length > 0 && user?.role && !item.roles.includes(user.role))
  );

  return (
    <>
      {/* --- BARRA DE NAVEGACIÓN FLOTANTE (CÁPSULA) --- */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-background/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-3 transition-all duration-300 hover:shadow-primary/10 hover:w-[98%] max-md:rounded-2xl">
        <div className="flex items-center justify-between">
          
          {/* 1. LOGO / BRAND */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/30">
              TN
            </div>
            <span className="font-bold text-lg hidden sm:block tracking-tight">Taxi Nort</span>
          </div>

          {/* 2. MENÚ DESKTOP (Horizontal) */}
          <div className="hidden md:flex items-center gap-1">
            {filteredItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link key={item.title} href={item.url}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "rounded-full px-4 h-9 text-sm transition-all duration-300",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* 3. PERFIL Y ACCIONES */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight mr-2">
              <span className="text-xs font-semibold">{user?.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{user?.role}</span>
            </div>
            
            {/* Botón Theme Toggle (Opcional, si lo tienes importado) */}
            <div className="hidden sm:block">
               <ThemeToggle /> 
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive hidden md:flex"
              onClick={handleLogout}
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* HAMBURGUESA MÓVIL */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* --- MENÚ DESPLEGABLE MÓVIL (SLIDE DOWN) --- */}
        <div 
            className={cn(
              "md:hidden overflow-hidden transition-all duration-500 ease-in-out",
              isMobileMenuOpen ? "max-h-[500px] opacity-100 mt-4 border-t pt-4" : "max-h-0 opacity-0"
            )}
        >
          <div className="flex flex-col gap-2 pb-2">
            {filteredItems.map((item) => (
              <Link key={item.title} href={item.url} onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant={location === item.url ? "secondary" : "ghost"} 
                  className="w-full justify-start rounded-xl"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            ))}
             <div className="h-px bg-border my-2" />
             <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
          </div>
        </div>
      </nav>
    </>
  );
}